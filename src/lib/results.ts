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

  const { data: evals } = await sb
    .from("evaluations")
    .select("id,participant_id,judge_id,submitted")
    .eq("submitted", true);
  const evalRows = evals ?? [];
  const evalIds = evalRows.map((e) => e.id as string);

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

  const weightSum = criteria.reduce((a, c) => a + c.max_score * Number(c.weight), 0);

  type Acc = {
    pctSum: number;
    judgeCount: number;
    crit: Map<string, { sum: number; n: number }>;
  };
  const accs = new Map<string, Acc>();
  for (const p of participants) accs.set(p.id, { pctSum: 0, judgeCount: 0, crit: new Map() });

  for (const e of evalRows) {
    const acc = accs.get(e.participant_id as string);
    if (!acc) continue;
    const sc = scoresByEval.get(e.id as string) ?? new Map<string, number>();
    let points = 0;
    for (const c of criteria) {
      const v = sc.get(c.id) ?? 0;
      points += v * Number(c.weight);
      const cc = acc.crit.get(c.id) ?? { sum: 0, n: 0 };
      cc.sum += v;
      cc.n += 1;
      acc.crit.set(c.id, cc);
    }
    acc.pctSum += weightSum > 0 ? (points / weightSum) * 100 : 0;
    acc.judgeCount += 1;
  }

  const rows: JudgeRow[] = participants
    .map((p) => {
      const a = accs.get(p.id)!;
      const perCriterion: Record<string, number> = {};
      for (const c of criteria) {
        const cc = a.crit.get(c.id);
        perCriterion[c.id] = cc && cc.n > 0 ? cc.sum / cc.n : 0;
      }
      return {
        participant: p,
        pct: a.judgeCount > 0 ? a.pctSum / a.judgeCount : 0,
        judgeCount: a.judgeCount,
        perCriterion,
      };
    })
    .sort((x, y) => y.pct - x.pct);

  return { rows, criteria };
}

// 심사위원상 티어: 대상 1, 최우수상 2, 우수상 2
export const JUDGE_AWARD_TIERS = ["대상", "최우수상", "최우수상", "우수상", "우수상"];
