"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/data";

type Result = { ok: true } | { ok: false; error: string; limit?: boolean };

/** Register / update the raffle identity (kept structurally separate from votes). */
export async function registerRaffle(input: {
  raffleToken: string;
  name: string;
  affiliation?: string;
}): Promise<Result> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "이름을 입력해 주세요." };

  const sb = createServiceClient();
  const { error } = await sb.from("raffle_entries").upsert(
    {
      raffle_token: input.raffleToken,
      name,
      affiliation: input.affiliation?.trim() || null,
    },
    { onConflict: "raffle_token" },
  );
  if (error) return { ok: false, error: "등록에 실패했습니다. 다시 시도해 주세요." };
  return { ok: true };
}

/** Cast one endorsement. Uses ONLY the anonymous vote token. */
export async function castVote(input: {
  voteToken: string;
  participantId: string;
}): Promise<Result> {
  const settings = await getSettings();
  if (settings.phase !== "voting")
    return { ok: false, error: "지금은 투표 시간이 아닙니다." };

  const sb = createServiceClient();

  // 0 = unlimited: only enforce a cap when max_votes_per_voter > 0.
  if (settings.max_votes_per_voter > 0) {
    const { count } = await sb
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("voter_token", input.voteToken);

    if ((count ?? 0) >= settings.max_votes_per_voter) {
      return {
        ok: false,
        limit: true,
        error: `최대 ${settings.max_votes_per_voter}팀까지 투표할 수 있어요.`,
      };
    }
  }

  const { error } = await sb
    .from("votes")
    .insert({ participant_id: input.participantId, voter_token: input.voteToken });

  if (error && !error.message.toLowerCase().includes("duplicate")) {
    return { ok: false, error: "투표에 실패했습니다." };
  }
  return { ok: true };
}

export async function removeVote(input: {
  voteToken: string;
  participantId: string;
}): Promise<Result> {
  const settings = await getSettings();
  if (settings.phase !== "voting")
    return { ok: false, error: "지금은 투표 시간이 아닙니다." };

  const sb = createServiceClient();
  await sb
    .from("votes")
    .delete()
    .eq("voter_token", input.voteToken)
    .eq("participant_id", input.participantId);
  return { ok: true };
}

/** Flag the raffle entry as "participated" (uses ONLY the raffle token). */
export async function markParticipated(raffleToken: string): Promise<Result> {
  const sb = createServiceClient();
  await sb
    .from("raffle_entries")
    .update({ participated: true })
    .eq("raffle_token", raffleToken);
  return { ok: true };
}

/** Restore which participants this device has already endorsed. */
export async function getMyVotes(voteToken: string): Promise<string[]> {
  if (!voteToken) return [];
  const sb = createServiceClient();
  const { data } = await sb
    .from("votes")
    .select("participant_id")
    .eq("voter_token", voteToken);
  return (data ?? []).map((r) => r.participant_id as string);
}
