import "server-only";

import { createServiceClient } from "./supabase/server";
import { getCriteria, getParticipants } from "./data";
import type { Criterion, Participant } from "./types";

export interface AudienceRow {
  participant: Participant;
  votes: number;
}

export async function getAudienceResults(): Promise<AudienceRow[]> {
  const sb = createServiceClient();
  const [{ data: counts }, participants] = await Promise.all([
    sb.from("vote_counts").select("participant_id,votes"),
    getParticipants({ publishedOnly: true }),
  ]);
  const map = new Map(
    (counts ?? []).map((c) => [c.participant_id as string, c.votes as number]),
  );
  return participants
    .map((p) => ({ participant: p, votes: map.get(p.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes);
}

export interface JudgeRow {
  participant: Participant;
  pct: number; // average weighted percentage across judges
  judgeCount: number;
  perCriterion: Record<string, number>; // average raw score per criterion
}

export async function getJudgeResults(): Promise<{
  rows: JudgeRow[];
  criteria: Criterion[];
}> {
  const sb = createServiceClient();
  const [criteria, participants] = await Promise.all([
    getCriteria(),
    getParticipants({ publishedOnly: true }),
  ]);

  const [{ data: evals }, { data: judges }] = await Promise.all([
    sb
      .from("evaluations")
      .select("id,participant_id,judge_id,submitted")
      .eq("submitted", true),
    sb.from("judges").select("id,weight"),
  ]);
  const evalRows = evals ?? [];
  const evalIds = evalRows.map((e) => e.id as string);

  // judge_id -> weight (defaults to 1)
  const judgeWeight = new Map(
    (judges ?? []).map((j) => [j.id as string, Number(j.weight)]),
  );

  const { data: scores } = evalIds.length
    ? await sb
        .from("evaluation_scores")
        .select("evaluation_id,criterion_id,score")
        .in("evaluation_id", evalIds)
    : { data: [] as { evaluation_id: string; criterion_id: string; score: number }[] };

  const scoresByEval = new Map<string, Map<string, number>>();
  for (const s of scores ?? []) {
    if (!scoresByEval.has(s.evaluation_id)) scoresByEval.set(s.evaluation_id, new Map());
    scoresByEval.get(s.evaluation_id)!.set(s.criterion_id, Number(s.score));
  }

  const maxWeighted = criteria.reduce((a, c) => a + c.max_score * Number(c.weight), 0);

  type Acc = {
    pctSum: number; // Σ (judgePct × judgeWeight)
    wSum: number; // Σ judgeWeight
    judgeCount: number;
    crit: Map<string, { sum: number; wsum: number }>;
  };
  const accs = new Map<string, Acc>();
  for (const p of participants)
    accs.set(p.id, { pctSum: 0, wSum: 0, judgeCount: 0, crit: new Map() });

  for (const e of evalRows) {
    const acc = accs.get(e.participant_id as string);
    if (!acc) continue;
    const wj = judgeWeight.get(e.judge_id as string) ?? 1;
    const sc = scoresByEval.get(e.id as string) ?? new Map<string, number>();
    let points = 0;
    for (const c of criteria) {
      const v = sc.get(c.id) ?? 0;
      points += v * Number(c.weight);
      const cc = acc.crit.get(c.id) ?? { sum: 0, wsum: 0 };
      cc.sum += v * wj;
      cc.wsum += wj;
      acc.crit.set(c.id, cc);
    }
    acc.pctSum += (maxWeighted > 0 ? (points / maxWeighted) * 100 : 0) * wj;
    acc.wSum += wj;
    acc.judgeCount += 1;
  }

  const rows: JudgeRow[] = participants
    .map((p) => {
      const a = accs.get(p.id)!;
      const perCriterion: Record<string, number> = {};
      for (const c of criteria) {
        const cc = a.crit.get(c.id);
        perCriterion[c.id] = cc && cc.wsum > 0 ? cc.sum / cc.wsum : 0;
      }
      return {
        participant: p,
        pct: a.wSum > 0 ? a.pctSum / a.wSum : 0,
        judgeCount: a.judgeCount,
        perCriterion,
      };
    })
    .sort((x, y) => y.pct - x.pct);

  return { rows, criteria };
}

// 심사위원상 티어: 대상 1, 최우수상 2, 우수상 2
export const JUDGE_AWARD_TIERS = ["대상", "최우수상", "최우수상", "우수상", "우수상"];
