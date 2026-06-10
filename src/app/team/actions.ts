"use server";

import { createServiceClient } from "@/lib/supabase/server";
import { SCREENSHOT_BUCKET, screenshotUrl } from "@/lib/storage";
import type { Participant, ScreenshotView } from "@/lib/types";

export interface TeamInfo {
  id: string;
  team_name: string;
  project_name: string;
  tagline: string;
  description: string;
  features: string;
  members: string;
  demo_url: string;
  thumbnail_url: string;
}

export interface TeamWorkspace {
  participant: TeamInfo;
  screenshots: ScreenshotView[];
}

async function findParticipant(code: string): Promise<Participant | null> {
  const c = code.trim();
  if (!c) return null;
  const sb = createServiceClient();
  const { data } = await sb.from("participants").select("*").eq("code", c).maybeSingle();
  return (data as Participant) ?? null;
}

export async function teamLogin(
  code: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const p = await findParticipant(code);
  if (!p) return { ok: false, error: "유효하지 않은 참가팀 코드입니다." };
  return { ok: true, name: p.project_name };
}

export async function getTeamWorkspace(
  code: string,
): Promise<{ ok: true; data: TeamWorkspace } | { ok: false; error: string }> {
  const p = await findParticipant(code);
  if (!p) return { ok: false, error: "유효하지 않은 참가팀 코드입니다." };

  const sb = createServiceClient();
  const { data: shots } = await sb
    .from("screenshots")
    .select("id,storage_path,caption,display_order")
    .eq("participant_id", p.id)
    .order("display_order", { ascending: true });

  return {
    ok: true,
    data: {
      participant: {
        id: p.id,
        team_name: p.team_name,
        project_name: p.project_name,
        tagline: p.tagline ?? "",
        description: p.description ?? "",
        features: p.features ?? "",
        members: p.members ?? "",
        demo_url: p.demo_url ?? "",
        thumbnail_url: p.thumbnail_url ?? "",
      },
      screenshots: (shots ?? []).map((s) => ({
        id: s.id as string,
        url: screenshotUrl(s.storage_path as string),
        caption: (s.caption as string) ?? null,
      })),
    },
  };
}

export async function updateOwnParticipant(
  code: string,
  fields: {
    team_name: string;
    project_name: string;
    tagline: string;
    description: string;
    features: string;
    members: string;
    demo_url: string;
    thumbnail_url: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = await findParticipant(code);
  if (!p) return { ok: false, error: "유효하지 않은 참가팀 코드입니다." };

  const team_name = fields.team_name.trim();
  const project_name = fields.project_name.trim();
  if (!team_name || !project_name)
    return { ok: false, error: "팀명과 프로젝트명은 필수입니다." };

  const sb = createServiceClient();
  await sb
    .from("participants")
    .update({
      team_name,
      project_name,
      tagline: fields.tagline.trim() || null,
      description: fields.description.trim() || null,
      features: fields.features.trim() || null,
      members: fields.members.trim() || null,
      demo_url: fields.demo_url.trim() || null,
      thumbnail_url: fields.thumbnail_url.trim() || null,
    })
    .eq("id", p.id);
  return { ok: true };
}

export async function addScreenshot(
  code: string,
  formData: FormData,
): Promise<{ ok: true; screenshot: ScreenshotView } | { ok: false; error: string }> {
  const p = await findParticipant(code);
  if (!p) return { ok: false, error: "유효하지 않은 참가팀 코드입니다." };

  const file = formData.get("file");
  const caption = ((formData.get("caption") as string) ?? "").trim();
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "이미지를 선택해 주세요." };
  if (file.size > 8 * 1024 * 1024)
    return { ok: false, error: "이미지가 너무 큽니다 (8MB 이하)." };

  const sb = createServiceClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = file.type || "image/jpeg";
  const ext = type.includes("png")
    ? "png"
    : type.includes("webp")
      ? "webp"
      : type.includes("gif")
        ? "gif"
        : "jpg";
  const path = `${p.id}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await sb.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, bytes, { contentType: type, upsert: false });
  if (upErr) return { ok: false, error: "업로드에 실패했습니다." };

  const { data: maxRow } = await sb
    .from("screenshots")
    .select("display_order")
    .eq("participant_id", p.id)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const display_order = ((maxRow?.display_order as number) ?? 0) + 1;

  const { data: row, error: insErr } = await sb
    .from("screenshots")
    .insert({ participant_id: p.id, storage_path: path, caption: caption || null, display_order })
    .select("id,storage_path,caption")
    .single();

  if (insErr || !row) {
    await sb.storage.from(SCREENSHOT_BUCKET).remove([path]);
    return { ok: false, error: "저장에 실패했습니다." };
  }

  return {
    ok: true,
    screenshot: {
      id: row.id as string,
      url: screenshotUrl(row.storage_path as string),
      caption: (row.caption as string) ?? null,
    },
  };
}

export async function updateScreenshotCaption(
  code: string,
  id: string,
  caption: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = await findParticipant(code);
  if (!p) return { ok: false, error: "유효하지 않은 참가팀 코드입니다." };
  const sb = createServiceClient();
  await sb
    .from("screenshots")
    .update({ caption: caption.trim() || null })
    .eq("id", id)
    .eq("participant_id", p.id);
  return { ok: true };
}

export async function deleteScreenshot(
  code: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = await findParticipant(code);
  if (!p) return { ok: false, error: "유효하지 않은 참가팀 코드입니다." };
  const sb = createServiceClient();
  const { data: shot } = await sb
    .from("screenshots")
    .select("id,storage_path")
    .eq("id", id)
    .eq("participant_id", p.id)
    .maybeSingle();
  if (!shot) return { ok: false, error: "스크린샷을 찾을 수 없습니다." };
  await sb.from("screenshots").delete().eq("id", shot.id);
  await sb.storage.from(SCREENSHOT_BUCKET).remove([shot.storage_path as string]);
  return { ok: true };
}

export async function moveScreenshot(
  code: string,
  id: string,
  dir: "up" | "down",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = await findParticipant(code);
  if (!p) return { ok: false, error: "유효하지 않은 참가팀 코드입니다." };
  const sb = createServiceClient();
  const { data: list } = await sb
    .from("screenshots")
    .select("id,display_order")
    .eq("participant_id", p.id)
    .order("display_order", { ascending: true });
  const arr = list ?? [];
  const idx = arr.findIndex((s) => s.id === id);
  if (idx < 0) return { ok: false, error: "스크린샷을 찾을 수 없습니다." };
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= arr.length) return { ok: true };

  const a = arr[idx];
  const b = arr[swapWith];
  await sb.from("screenshots").update({ display_order: b.display_order }).eq("id", a.id);
  await sb.from("screenshots").update({ display_order: a.display_order }).eq("id", b.id);
  return { ok: true };
}
