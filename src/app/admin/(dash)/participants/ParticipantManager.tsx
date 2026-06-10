"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Participant } from "@/lib/types";
import {
  createParticipant,
  deleteParticipant,
  regenerateParticipantCode,
  updateParticipant,
  type ParticipantInput,
} from "../../actions";

const EMPTY: ParticipantInput = {
  team_name: "",
  project_name: "",
  tagline: "",
  description: "",
  thumbnail_url: "",
  demo_url: "",
  members: "",
  display_order: 0,
  published: true,
};

function toInput(p: Participant): ParticipantInput {
  return {
    team_name: p.team_name,
    project_name: p.project_name,
    tagline: p.tagline ?? "",
    description: p.description ?? "",
    thumbnail_url: p.thumbnail_url ?? "",
    demo_url: p.demo_url ?? "",
    members: p.members ?? "",
    display_order: p.display_order,
    published: p.published,
  };
}

export default function ParticipantManager({
  participants,
}: {
  participants: Participant[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<ParticipantInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function copy(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  async function regenCode(id: string) {
    if (!confirm("이 팀의 코드를 재발급할까요? 기존 코드는 사용할 수 없게 됩니다.")) return;
    setBusy(true);
    await regenerateParticipantCode(id);
    setBusy(false);
    router.refresh();
  }

  function startNew() {
    setDraft({ ...EMPTY, display_order: participants.length + 1 });
    setError(null);
    setEditing("new");
  }
  function startEdit(p: Participant) {
    setDraft(toInput(p));
    setError(null);
    setEditing(p.id);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res =
      editing === "new"
        ? await createParticipant(draft)
        : await updateParticipant(editing!, draft);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("이 팀을 삭제할까요? 관련 투표·심사 기록도 함께 삭제됩니다.")) return;
    setBusy(true);
    await deleteParticipant(id);
    setBusy(false);
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">참가팀 ({participants.length})</h1>
          <p className="text-sm text-white/50">
            각 팀에 <span className="font-mono text-white/70">코드</span>와{" "}
            <span className="font-mono text-white/70">/team</span> 링크를 전달하면 팀이
            직접 정보·스크린샷을 수정합니다.
          </p>
        </div>
        {editing !== "new" && (
          <button className="btn-primary shrink-0" onClick={startNew}>
            + 팀 추가
          </button>
        )}
      </div>

      {editing === "new" && (
        <Form
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => setEditing(null)}
          busy={busy}
          error={error}
        />
      )}

      <ul className="space-y-2.5">
        {participants.map((p) => (
          <li key={p.id} className="card p-4">
            {editing === p.id ? (
              <Form
                draft={draft}
                setDraft={setDraft}
                onSave={save}
                onCancel={() => setEditing(null)}
                busy={busy}
                error={error}
              />
            ) : (
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-sm text-white/40">
                  {p.display_order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-brand-soft">{p.team_name}</p>
                  <p className="truncate font-bold">
                    {p.project_name}
                    {!p.published && (
                      <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/50">
                        비공개
                      </span>
                    )}
                  </p>
                  {p.tagline && (
                    <p className="truncate text-sm text-white/45">{p.tagline}</p>
                  )}
                  {p.code && (
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => copy(p.code!)}
                        className="rounded bg-black/30 px-2 py-0.5 font-mono text-xs tracking-wider text-brand-soft hover:bg-black/50"
                        title="클릭하여 복사"
                      >
                        {p.code}
                      </button>
                      <span className="text-xs text-white/30">
                        {copied === p.code ? "복사됨 ✓" : ""}
                      </span>
                      <button
                        onClick={() => regenCode(p.id)}
                        disabled={busy}
                        className="text-xs text-white/35 hover:text-white/70"
                      >
                        재발급
                      </button>
                    </div>
                  )}
                </div>
                <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => startEdit(p)}>
                  편집
                </button>
                <button
                  className="px-2 py-1.5 text-sm text-red-400 hover:text-red-300"
                  onClick={() => remove(p.id)}
                >
                  삭제
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {participants.length === 0 && editing !== "new" && (
        <p className="text-white/40">아직 등록된 팀이 없습니다. “팀 추가”로 시작하세요.</p>
      )}
    </div>
  );
}

function Form({
  draft,
  setDraft,
  onSave,
  onCancel,
  busy,
  error,
}: {
  draft: ParticipantInput;
  setDraft: (d: ParticipantInput) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const up = (patch: Partial<ParticipantInput>) => setDraft({ ...draft, ...patch });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">팀명 *</label>
          <input
            className="input"
            value={draft.team_name}
            onChange={(e) => up({ team_name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">프로젝트명 *</label>
          <input
            className="input"
            value={draft.project_name}
            onChange={(e) => up({ project_name: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="label">한 줄 소개</label>
        <input
          className="input"
          value={draft.tagline}
          onChange={(e) => up({ tagline: e.target.value })}
        />
      </div>
      <div>
        <label className="label">상세 설명</label>
        <textarea
          className="input min-h-24"
          value={draft.description}
          onChange={(e) => up({ description: e.target.value })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">썸네일 이미지 URL</label>
          <input
            className="input"
            value={draft.thumbnail_url}
            onChange={(e) => up({ thumbnail_url: e.target.value })}
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="label">데모/링크 URL</label>
          <input
            className="input"
            value={draft.demo_url}
            onChange={(e) => up({ demo_url: e.target.value })}
            placeholder="https://…"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">팀원</label>
          <input
            className="input"
            value={draft.members}
            onChange={(e) => up({ members: e.target.value })}
            placeholder="홍길동, 김철수"
          />
        </div>
        <div>
          <label className="label">표시 순서</label>
          <input
            type="number"
            className="input"
            value={draft.display_order}
            onChange={(e) => up({ display_order: Number(e.target.value) })}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={draft.published}
          onChange={(e) => up({ published: e.target.checked })}
        />
        공개 (관객 투표 목록에 표시)
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={busy} onClick={onSave}>
          저장
        </button>
        <button className="btn-ghost" disabled={busy} onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
}
