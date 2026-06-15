"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Criterion } from "@/lib/types";
import {
  createCriterion,
  deleteCriterion,
  updateCriterion,
  type CriterionInput,
} from "../../actions";

const EMPTY: CriterionInput = {
  label: "",
  description: "",
  level_low: "",
  level_mid: "",
  level_high: "",
  max_score: 10,
  weight: 1,
  display_order: 0,
};

function toInput(c: Criterion): CriterionInput {
  return {
    label: c.label,
    description: c.description ?? "",
    level_low: c.level_low ?? "",
    level_mid: c.level_mid ?? "",
    level_high: c.level_high ?? "",
    max_score: c.max_score,
    weight: Number(c.weight),
    display_order: c.display_order,
  };
}

export default function RubricManager({ criteria }: { criteria: Criterion[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<CriterionInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalWeight = criteria.reduce((a, c) => a + Number(c.weight), 0);

  async function save() {
    setBusy(true);
    setError(null);
    const res =
      editing === "new"
        ? await createCriterion(draft)
        : await updateCriterion(editing!, draft);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("이 평가 항목을 삭제할까요?")) return;
    setBusy(true);
    await deleteCriterion(id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">심사 기준</h1>
          <p className="text-sm text-white/50">
            가중치 합계 {totalWeight} · 점수는 항목별 최대점 기준으로 가중 합산됩니다.
          </p>
        </div>
        {editing !== "new" && (
          <button
            className="btn-primary"
            onClick={() => {
              setDraft({ ...EMPTY, display_order: criteria.length + 1 });
              setError(null);
              setEditing("new");
            }}
          >
            + 항목 추가
          </button>
        )}
      </div>

      {editing === "new" && (
        <div className="card p-4">
          <Form
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onCancel={() => setEditing(null)}
            busy={busy}
            error={error}
          />
        </div>
      )}

      <ul className="space-y-2.5">
        {criteria.map((c) => (
          <li key={c.id} className="card p-4">
            {editing === c.id ? (
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
                  {c.display_order}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {c.label}
                    <span className="ml-2 text-sm font-normal text-white/45">
                      최대 {c.max_score}점 · 가중치 ×{Number(c.weight)}
                    </span>
                  </p>
                  {c.description && (
                    <p className="truncate text-sm text-white/45">{c.description}</p>
                  )}
                </div>
                <button
                  className="btn-ghost px-3 py-1.5 text-sm"
                  onClick={() => {
                    setDraft(toInput(c));
                    setError(null);
                    setEditing(c.id);
                  }}
                >
                  편집
                </button>
                <button
                  className="px-2 py-1.5 text-sm text-red-400 hover:text-red-300"
                  onClick={() => remove(c.id)}
                >
                  삭제
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {criteria.length === 0 && editing !== "new" && (
        <p className="text-white/40">평가 항목을 추가해 주세요.</p>
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
  draft: CriterionInput;
  setDraft: (d: CriterionInput) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
}) {
  const up = (patch: Partial<CriterionInput>) => setDraft({ ...draft, ...patch });
  return (
    <div className="space-y-3">
      <div>
        <label className="label">항목명 *</label>
        <input
          className="input"
          value={draft.label}
          onChange={(e) => up({ label: e.target.value })}
          placeholder="혁신성"
        />
      </div>
      <div>
        <label className="label">설명 (선택)</label>
        <input
          className="input"
          value={draft.description}
          onChange={(e) => up({ description: e.target.value })}
          placeholder="한 줄 보조 설명"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">낮음</label>
          <textarea
            className="input min-h-20 text-sm"
            value={draft.level_low}
            onChange={(e) => up({ level_low: e.target.value })}
          />
        </div>
        <div>
          <label className="label">보통</label>
          <textarea
            className="input min-h-20 text-sm"
            value={draft.level_mid}
            onChange={(e) => up({ level_mid: e.target.value })}
          />
        </div>
        <div>
          <label className="label">탁월</label>
          <textarea
            className="input min-h-20 text-sm"
            value={draft.level_high}
            onChange={(e) => up({ level_high: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">최대 점수</label>
          <input
            type="number"
            min={1}
            max={100}
            className="input"
            value={draft.max_score}
            onChange={(e) => up({ max_score: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">가중치</label>
          <input
            type="number"
            min={0}
            step={0.1}
            className="input"
            value={draft.weight}
            onChange={(e) => up({ weight: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label">순서</label>
          <input
            type="number"
            className="input"
            value={draft.display_order}
            onChange={(e) => up({ display_order: Number(e.target.value) })}
          />
        </div>
      </div>
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
