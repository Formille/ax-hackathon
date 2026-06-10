"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getScreenshotsByParticipant, getSettings } from "@/lib/data";
import type { Criterion, Participant, ScreenshotView } from "@/lib/types";

export interface JudgeEvalState {
  comment: string;
  submitted: boolean;
  scores: Record<string, number>; // criterionId -> score
  scoreComments: Record<string, string>; // criterionId -> comment
}

export interface JudgeWorkspace {
  judge: { id: string; name: string };
  judgingOpen: boolean;
  participants: Participant[];
  criteria: Criterion[];
  evaluations: Record<string, JudgeEvalState>; // participantId -> state
  screenshots: Record<string, ScreenshotView[]>; // participantId -> screenshots
}

async function findJudge(code: string) {
  const sb = createServiceClient();
  const { data } = await sb
    .from("judges")
    .select("id,name,active")
    .eq("code", code.trim())
    .maybeSingle();
  if (!data || !data.active) return null;
  return data as { id: string; name: string; active: boolean };
}

export async function judgeLogin(
  code: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  if (!code.trim()) return { ok: false, error: "코드를 입력해 주세요." };
  const judge = await findJudge(code);
  if (!judge) return { ok: false, error: "유효하지 않은 심사위원 코드입니다." };
  return { ok: true, name: judge.name };
}

export async function getJudgeWorkspace(
  code: string,
): Promise<{ ok: true; data: JudgeWorkspace } | { ok: false; error: string }> {
  const judge = await findJudge(code);
  if (!judge) return { ok: false, error: "유효하지 않은 심사위원 코드입니다." };

  const sb = createServiceClient();
  const settings = await getSettings();

  const [{ data: participants }, { data: criteria }, { data: evals }] =
    await Promise.all([
      sb.from("participants").select("*").eq("published", true).order("display_order"),
      sb.from("criteria").select("*").order("display_order"),
      sb
        .from("evaluations")
        .select("id,participant_id,comment,submitted")
        .eq("judge_id", judge.id),
    ]);

  const evalRows = evals ?? [];
  const evalIds = evalRows.map((e) => e.id as string);
  const { data: scores } = evalIds.length
    ? await sb
        .from("evaluation_scores")
        .select("evaluation_id,criterion_id,score,comment")
        .in("evaluation_id", evalIds)
    : { data: [] as { evaluation_id: string; criterion_id: string; score: number; comment: string | null }[] };

  const evalIdToParticipant = new Map(
    evalRows.map((e) => [e.id as string, e.participant_id as string]),
  );

  const evaluations: Record<string, JudgeEvalState> = {};
  for (const e of evalRows) {
    evaluations[e.participant_id as string] = {
      comment: (e.comment as string) ?? "",
      submitted: Boolean(e.submitted),
      scores: {},
      scoreComments: {},
    };
  }
  for (const s of scores ?? []) {
    const pid = evalIdToParticipant.get(s.evaluation_id);
    if (!pid || !evaluations[pid]) continue;
    evaluations[pid].scores[s.criterion_id] = Number(s.score);
    if (s.comment) evaluations[pid].scoreComments[s.criterion_id] = s.comment;
  }

  const screenshots = await getScreenshotsByParticipant();

  return {
    ok: true,
    data: {
      judge: { id: judge.id, name: judge.name },
      judgingOpen: settings.judging_open,
      participants: (participants ?? []) as Participant[],
      criteria: (criteria ?? []) as Criterion[],
      evaluations,
      screenshots,
    },
  };
}

export async function saveEvaluation(input: {
  code: string;
  participantId: string;
  comment: string;
  submitted: boolean;
  scores: { criterionId: string; score: number; comment?: string }[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const judge = await findJudge(input.code);
  if (!judge) return { ok: false, error: "유효하지 않은 심사위원 코드입니다." };

  const settings = await getSettings();
  if (!settings.judging_open) return { ok: false, error: "심사가 마감되었습니다." };

  const sb = createServiceClient();

  // clamp scores against each criterion's max
  const { data: criteria } = await sb.from("criteria").select("id,max_score");
  const maxById = new Map((criteria ?? []).map((c) => [c.id as string, c.max_score as number]));

  const { data: evalRow, error: evalErr } = await sb
    .from("evaluations")
    .upsert(
      {
        judge_id: judge.id,
        participant_id: input.participantId,
        comment: input.comment.trim() || null,
        submitted: input.submitted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "judge_id,participant_id" },
    )
    .select("id")
    .single();

  if (evalErr || !evalRow) return { ok: false, error: "저장에 실패했습니다." };

  const rows = input.scores.map((s) => {
    const max = maxById.get(s.criterionId) ?? 10;
    const clamped = Math.max(0, Math.min(max, Number(s.score) || 0));
    return {
      evaluation_id: evalRow.id as string,
      criterion_id: s.criterionId,
      score: clamped,
      comment: s.comment?.trim() || null,
    };
  });

  if (rows.length) {
    const { error: scoreErr } = await sb
      .from("evaluation_scores")
      .upsert(rows, { onConflict: "evaluation_id,criterion_id" });
    if (scoreErr) return { ok: false, error: "점수 저장에 실패했습니다." };
  }

  return { ok: true };
}
