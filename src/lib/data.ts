import "server-only";

import { createServiceClient } from "./supabase/server";
import type { Criterion, Participant, Settings } from "./types";

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  event_name: "해커톤",
  phase: "draft",
  current_participant_id: null,
  max_votes_per_voter: 3,
  judging_open: true,
  popularity_award_label: "인기상",
  updated_at: new Date(0).toISOString(),
};

export async function getSettings(): Promise<Settings> {
  const sb = createServiceClient();
  const { data } = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
  return (data as Settings) ?? DEFAULT_SETTINGS;
}

export async function getParticipants(opts?: {
  publishedOnly?: boolean;
}): Promise<Participant[]> {
  const sb = createServiceClient();
  let query = sb.from("participants").select("*").order("display_order");
  if (opts?.publishedOnly) query = query.eq("published", true);
  const { data } = await query;
  return (data ?? []) as Participant[];
}

export async function getCriteria(): Promise<Criterion[]> {
  const sb = createServiceClient();
  const { data } = await sb.from("criteria").select("*").order("display_order");
  return (data ?? []) as Criterion[];
}
