"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Phase, RaffleEntry } from "@/lib/types";

async function guard() {
  await requireAdmin();
  return createServiceClient();
}

function refresh() {
  revalidatePath("/admin", "layout");
}

// ----------------------------------------------------------------- settings
export async function setPhase(phase: Phase) {
  const sb = await guard();
  await sb
    .from("settings")
    .update({ phase, updated_at: new Date().toISOString() })
    .eq("id", 1);
  refresh();
  return { ok: true as const };
}

export async function setJudgingOpen(open: boolean) {
  const sb = await guard();
  await sb.from("settings").update({ judging_open: open }).eq("id", 1);
  refresh();
  return { ok: true as const };
}

export async function setCurrentParticipant(id: string | null) {
  const sb = await guard();
  await sb.from("settings").update({ current_participant_id: id }).eq("id", 1);
  refresh();
  return { ok: true as const };
}

export async function updateEventSettings(input: {
  event_name: string;
  max_votes_per_voter: number;
  popularity_award_label: string;
}) {
  const sb = await guard();
  await sb
    .from("settings")
    .update({
      event_name: input.event_name.trim() || "해커톤",
      max_votes_per_voter: Math.max(0, Math.min(50, Math.round(input.max_votes_per_voter))),
      popularity_award_label: input.popularity_award_label.trim() || "인기상",
    })
    .eq("id", 1);
  refresh();
  return { ok: true as const };
}

// ------------------------------------------------------------- participants
export interface ParticipantInput {
  team_name: string;
  project_name: string;
  tagline: string;
  description: string;
  thumbnail_url: string;
  demo_url: string;
  members: string;
  display_order: number;
  published: boolean;
}

function cleanParticipant(input: ParticipantInput) {
  return {
    team_name: input.team_name.trim(),
    project_name: input.project_name.trim(),
    tagline: input.tagline.trim() || null,
    description: input.description.trim() || null,
    thumbnail_url: input.thumbnail_url.trim() || null,
    demo_url: input.demo_url.trim() || null,
    members: input.members.trim() || null,
    display_order: Math.round(input.display_order) || 0,
    published: input.published,
  };
}

export async function createParticipant(input: ParticipantInput) {
  const sb = await guard();
  const row = cleanParticipant(input);
  if (!row.team_name || !row.project_name)
    return { ok: false as const, error: "팀명과 프로젝트명은 필수입니다." };
  await sb.from("participants").insert(row);
  refresh();
  return { ok: true as const };
}

export async function updateParticipant(id: string, input: ParticipantInput) {
  const sb = await guard();
  const row = cleanParticipant(input);
  if (!row.team_name || !row.project_name)
    return { ok: false as const, error: "팀명과 프로젝트명은 필수입니다." };
  await sb.from("participants").update(row).eq("id", id);
  refresh();
  return { ok: true as const };
}

export async function deleteParticipant(id: string) {
  const sb = await guard();
  await sb.from("participants").delete().eq("id", id);
  refresh();
  return { ok: true as const };
}

// ------------------------------------------------------------------ criteria
export interface CriterionInput {
  label: string;
  description: string;
  max_score: number;
  weight: number;
  display_order: number;
}

function cleanCriterion(input: CriterionInput) {
  return {
    label: input.label.trim(),
    description: input.description.trim() || null,
    max_score: Math.max(1, Math.min(100, Math.round(input.max_score))),
    weight: Math.max(0, Number(input.weight)),
    display_order: Math.round(input.display_order) || 0,
  };
}

export async function createCriterion(input: CriterionInput) {
  const sb = await guard();
  const row = cleanCriterion(input);
  if (!row.label) return { ok: false as const, error: "항목명을 입력해 주세요." };
  await sb.from("criteria").insert(row);
  refresh();
  return { ok: true as const };
}

export async function updateCriterion(id: string, input: CriterionInput) {
  const sb = await guard();
  const row = cleanCriterion(input);
  if (!row.label) return { ok: false as const, error: "항목명을 입력해 주세요." };
  await sb.from("criteria").update(row).eq("id", id);
  refresh();
  return { ok: true as const };
}

export async function deleteCriterion(id: string) {
  const sb = await guard();
  await sb.from("criteria").delete().eq("id", id);
  refresh();
  return { ok: true as const };
}

// -------------------------------------------------------------------- judges
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode() {
  let s = "";
  for (let i = 0; i < 5; i++)
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return `JUDGE-${s}`;
}

async function uniqueCode(sb: ReturnType<typeof createServiceClient>) {
  for (let i = 0; i < 8; i++) {
    const code = genCode();
    const { data } = await sb.from("judges").select("id").eq("code", code).maybeSingle();
    if (!data) return code;
  }
  return `JUDGE-${Date.now().toString(36).toUpperCase()}`;
}

export async function createJudge(name: string) {
  const sb = await guard();
  if (!name.trim()) return { ok: false as const, error: "심사위원 이름을 입력해 주세요." };
  const code = await uniqueCode(sb);
  await sb.from("judges").insert({ name: name.trim(), code });
  refresh();
  return { ok: true as const, code };
}

export async function updateJudge(id: string, input: { name: string; active: boolean }) {
  const sb = await guard();
  await sb
    .from("judges")
    .update({ name: input.name.trim(), active: input.active })
    .eq("id", id);
  refresh();
  return { ok: true as const };
}

export async function regenerateJudgeCode(id: string) {
  const sb = await guard();
  const code = await uniqueCode(sb);
  await sb.from("judges").update({ code }).eq("id", id);
  refresh();
  return { ok: true as const, code };
}

export async function deleteJudge(id: string) {
  const sb = await guard();
  await sb.from("judges").delete().eq("id", id);
  refresh();
  return { ok: true as const };
}

// -------------------------------------------------------------------- raffle
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export async function getRaffleEntries(): Promise<RaffleEntry[]> {
  const sb = await guard();
  const { data } = await sb
    .from("raffle_entries")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as RaffleEntry[];
}

export async function drawRaffle(count: number): Promise<
  | { ok: true; seed: string; winners: { id: string; name: string; affiliation: string | null }[] }
  | { ok: false; error: string }
> {
  const sb = await guard();
  const { data } = await sb
    .from("raffle_entries")
    .select("id,name,affiliation")
    .eq("participated", true)
    .eq("is_winner", false);
  const pool = (data ?? []) as { id: string; name: string; affiliation: string | null }[];
  if (pool.length === 0)
    return { ok: false, error: "추첨 대상(참여자)이 없습니다." };

  const n = Math.max(1, Math.min(count, pool.length));
  const seedNum = Math.floor(Math.random() * 0xffffffff);
  const seed = seedNum.toString(16).padStart(8, "0");
  const rng = mulberry32(seedNum);

  // deterministic order, then seeded Fisher–Yates shuffle
  const arr = [...pool].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const winners = arr.slice(0, n);
  await sb
    .from("raffle_entries")
    .update({ is_winner: true })
    .in(
      "id",
      winners.map((w) => w.id),
    );
  refresh();
  return { ok: true, seed, winners };
}

export async function resetRaffle() {
  const sb = await guard();
  await sb.from("raffle_entries").update({ is_winner: false }).eq("is_winner", true);
  refresh();
  return { ok: true as const };
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function raffleCsv(): Promise<string> {
  const sb = await guard();
  const { data } = await sb
    .from("raffle_entries")
    .select("name,affiliation,participated,is_winner,created_at")
    .order("created_at", { ascending: true });
  const header = "name,affiliation,participated,is_winner,created_at";
  const lines = (data ?? []).map((r) =>
    [r.name, r.affiliation, r.participated, r.is_winner, r.created_at]
      .map(csvCell)
      .join(","),
  );
  return [header, ...lines].join("\n");
}
