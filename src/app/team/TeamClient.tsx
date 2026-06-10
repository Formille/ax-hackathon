"use client";

import { useEffect, useRef, useState } from "react";
import { clearTeamCode, getTeamCode, setTeamCode } from "@/lib/tokens";
import type { ScreenshotView } from "@/lib/types";
import ScreenshotCarousel from "@/components/ScreenshotCarousel";
import {
  addScreenshot,
  deleteScreenshot,
  getTeamWorkspace,
  moveScreenshot,
  teamLogin,
  updateOwnParticipant,
  updateScreenshotCaption,
  type TeamInfo,
} from "./actions";

type View = "loading" | "login" | "edit";

/** Downscale large images client-side to keep uploads small and fast. */
async function downscale(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", 0.82),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export default function TeamClient() {
  const [view, setView] = useState<View>("loading");
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<TeamInfo | null>(null);
  const [shots, setShots] = useState<ScreenshotView[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [newCaption, setNewCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = getTeamCode();
    if (!saved) return setView("login");
    getTeamWorkspace(saved).then((res) => {
      if (res.ok) {
        setCode(saved);
        setInfo(res.data.participant);
        setShots(res.data.screenshots);
        setView("edit");
      } else {
        clearTeamCode();
        setView("login");
      }
    });
  }, []);

  function flash(m: string) {
    setToast(m);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const login = await teamLogin(code);
    if (!login.ok) {
      setBusy(false);
      return flash(login.error);
    }
    const res = await getTeamWorkspace(code);
    setBusy(false);
    if (!res.ok) return flash(res.error);
    setTeamCode(code.trim());
    setInfo(res.data.participant);
    setShots(res.data.screenshots);
    setView("edit");
  }

  function up(patch: Partial<TeamInfo>) {
    setInfo((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function saveInfo() {
    if (!info) return;
    setBusy(true);
    const res = await updateOwnParticipant(code, {
      team_name: info.team_name,
      project_name: info.project_name,
      tagline: info.tagline,
      description: info.description,
      members: info.members,
      demo_url: info.demo_url,
      thumbnail_url: info.thumbnail_url,
    });
    setBusy(false);
    if (!res.ok) return flash(res.error);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const blob = await downscale(file);
    const fd = new FormData();
    fd.append("file", blob, blob instanceof File ? blob.name : "shot.jpg");
    fd.append("caption", newCaption);
    const res = await addScreenshot(code, fd);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) return flash(res.error);
    setShots((prev) => [...prev, res.screenshot]);
    setNewCaption("");
    flash("스크린샷이 추가되었습니다");
  }

  async function removeShot(id: string) {
    if (!confirm("이 스크린샷을 삭제할까요?")) return;
    setBusy(true);
    const res = await deleteScreenshot(code, id);
    setBusy(false);
    if (!res.ok) return flash(res.error);
    setShots((prev) => prev.filter((s) => s.id !== id));
  }

  async function move(id: string, dir: "up" | "down") {
    const i = shots.findIndex((s) => s.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= shots.length) return;
    setBusy(true);
    const res = await moveScreenshot(code, id, dir);
    setBusy(false);
    if (!res.ok) return flash(res.error);
    setShots((prev) => {
      const arr = [...prev];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  function setCaptionLocal(id: string, caption: string) {
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, caption } : s)));
  }

  if (view === "loading") {
    return <div className="mt-24 text-center text-white/40">불러오는 중…</div>;
  }

  if (view === "login") {
    return (
      <section className="mt-12">
        <h1 className="text-2xl font-bold">참가팀 입장</h1>
        <p className="mt-2 text-white/55">발급받은 참가팀 코드를 입력하세요.</p>
        <form onSubmit={handleLogin} className="card mt-6 space-y-4 p-5">
          <div>
            <label className="label">참가팀 코드</label>
            <input
              className="input font-mono tracking-wider"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="TEAM-XXXXX"
              autoFocus
              autoCapitalize="characters"
            />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "확인 중…" : "입장"}
          </button>
        </form>
        <Toast message={toast} />
      </section>
    );
  }

  if (!info) return null;

  return (
    <section className="mt-6 space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-brand-soft">{info.team_name}</p>
          <h1 className="text-2xl font-bold">{info.project_name}</h1>
        </div>
        <button
          className="btn-ghost text-sm"
          onClick={() => {
            clearTeamCode();
            setInfo(null);
            setCode("");
            setView("login");
          }}
        >
          로그아웃
        </button>
      </div>

      {/* info */}
      <div className="card space-y-3 p-5">
        <h2 className="font-bold">팀 정보</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">팀명 *</label>
            <input className="input" value={info.team_name} onChange={(e) => up({ team_name: e.target.value })} />
          </div>
          <div>
            <label className="label">프로젝트명 *</label>
            <input className="input" value={info.project_name} onChange={(e) => up({ project_name: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">한 줄 소개</label>
          <input className="input" value={info.tagline} onChange={(e) => up({ tagline: e.target.value })} />
        </div>
        <div>
          <label className="label">상세 설명</label>
          <textarea className="input min-h-28" value={info.description} onChange={(e) => up({ description: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">팀원</label>
            <input className="input" value={info.members} onChange={(e) => up({ members: e.target.value })} placeholder="홍길동, 김철수" />
          </div>
          <div>
            <label className="label">데모/링크 URL</label>
            <input className="input" value={info.demo_url} onChange={(e) => up({ demo_url: e.target.value })} placeholder="https://…" />
          </div>
        </div>
        <div>
          <label className="label">대표 이미지 URL (선택)</label>
          <input className="input" value={info.thumbnail_url} onChange={(e) => up({ thumbnail_url: e.target.value })} placeholder="https://…" />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={busy} onClick={saveInfo}>
            정보 저장
          </button>
          {saved && <span className="text-sm text-accent">저장됨 ✓</span>}
        </div>
      </div>

      {/* screenshots */}
      <div className="card space-y-4 p-5">
        <div>
          <h2 className="font-bold">앱 스크린샷</h2>
          <p className="text-sm text-white/50">
            투표자·심사위원이 아래 순서대로 넘겨봅니다. 큰 이미지는 자동으로 축소됩니다.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-white/15 p-4">
          <label className="label">새 스크린샷 캡션 (선택)</label>
          <input
            className="input"
            value={newCaption}
            onChange={(e) => setNewCaption(e.target.value)}
            placeholder="예: 메인 대시보드 화면"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
          />
          <button
            className="btn-ghost mt-3"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "처리 중…" : "+ 이미지 선택해서 추가"}
          </button>
        </div>

        {shots.length === 0 ? (
          <p className="text-sm text-white/40">아직 등록된 스크린샷이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {shots.map((s, i) => (
              <li key={s.id} className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.url}
                  alt={s.caption ?? `스크린샷 ${i + 1}`}
                  className="h-16 w-24 shrink-0 rounded-lg object-cover"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <input
                    className="input py-1.5 text-sm"
                    value={s.caption ?? ""}
                    placeholder="캡션"
                    onChange={(e) => setCaptionLocal(s.id, e.target.value)}
                    onBlur={(e) => updateScreenshotCaption(code, s.id, e.target.value)}
                  />
                  <div className="flex gap-1.5 text-xs">
                    <button className="btn-ghost px-2 py-1" disabled={busy || i === 0} onClick={() => move(s.id, "up")}>
                      ↑
                    </button>
                    <button
                      className="btn-ghost px-2 py-1"
                      disabled={busy || i === shots.length - 1}
                      onClick={() => move(s.id, "down")}
                    >
                      ↓
                    </button>
                    <button className="px-2 py-1 text-red-400 hover:text-red-300" onClick={() => removeShot(s.id)}>
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {shots.length > 0 && (
          <div>
            <p className="label">미리보기 (관람객 화면)</p>
            <ScreenshotCarousel shots={shots} />
          </div>
        )}
      </div>

      <Toast message={toast} />
    </section>
  );
}

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="animate-pop-in fixed inset-x-0 bottom-8 z-50 mx-auto w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-lg">
      {message}
    </div>
  );
}
