"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Judge } from "@/lib/types";
import {
  createJudge,
  deleteJudge,
  regenerateJudgeCode,
  updateJudge,
} from "../../actions";

export default function JudgeManager({ judges }: { judges: Judge[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    await createJudge(name);
    setBusy(false);
    setName("");
    router.refresh();
  }

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    await fn();
    setBusy(false);
    router.refresh();
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">심사위원</h1>
        <p className="text-sm text-white/50">
          각 심사위원에게 코드와 <span className="font-mono">/judge</span> 링크를
          개별 전달하세요. <b className="text-white/70">가중치</b>는 최종 심사 점수에
          가중 평균으로 반영됩니다. (기본 1)
        </p>
      </div>

      <div className="card flex gap-2 p-4">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="심사위원 이름"
        />
        <button className="btn-primary shrink-0" disabled={busy} onClick={add}>
          + 추가
        </button>
      </div>

      <ul className="space-y-2.5">
        {judges.map((j) => (
          <li key={j.id} className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                {editingId === j.id ? (
                  <div className="flex gap-2">
                    <input
                      className="input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="btn-ghost shrink-0 px-3 text-sm"
                      onClick={() =>
                        act(async () => {
                          await updateJudge(j.id, {
                            name: editName,
                            active: j.active,
                            weight: Number(j.weight),
                          });
                          setEditingId(null);
                        })
                      }
                    >
                      저장
                    </button>
                  </div>
                ) : (
                  <p className="font-bold">
                    {j.name}
                    {!j.active && (
                      <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-xs text-white/50">
                        비활성
                      </span>
                    )}
                  </p>
                )}
                <button
                  onClick={() => copy(j.code)}
                  className="mt-1 inline-flex items-center gap-2 rounded-lg bg-black/30 px-2.5 py-1 font-mono text-sm tracking-wider text-brand-soft hover:bg-black/50"
                  title="클릭하여 복사"
                >
                  {j.code}
                  <span className="text-xs text-white/40">
                    {copied === j.code ? "복사됨 ✓" : "복사"}
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <label className="flex items-center gap-1 rounded-lg bg-black/30 px-2 py-1.5 text-sm text-white/60">
                  가중치
                  <input
                    key={`w-${j.id}-${Number(j.weight)}`}
                    type="number"
                    min={0}
                    step={0.5}
                    defaultValue={Number(j.weight)}
                    disabled={busy}
                    onBlur={(e) =>
                      act(() =>
                        updateJudge(j.id, {
                          name: j.name,
                          active: j.active,
                          weight: Number(e.target.value),
                        }),
                      )
                    }
                    className="w-12 rounded bg-transparent text-right font-semibold text-white outline-none"
                  />
                </label>
                <button
                  className="btn-ghost px-2.5 py-1.5 text-sm"
                  onClick={() => {
                    setEditingId(j.id);
                    setEditName(j.name);
                  }}
                >
                  이름수정
                </button>
                <button
                  className="btn-ghost px-2.5 py-1.5 text-sm"
                  onClick={() =>
                    act(() =>
                      updateJudge(j.id, {
                        name: j.name,
                        active: !j.active,
                        weight: Number(j.weight),
                      }),
                    )
                  }
                >
                  {j.active ? "비활성화" : "활성화"}
                </button>
                <button
                  className="btn-ghost px-2.5 py-1.5 text-sm"
                  onClick={() => {
                    if (confirm("코드를 재발급할까요? 기존 코드는 사용할 수 없게 됩니다."))
                      act(() => regenerateJudgeCode(j.id));
                  }}
                >
                  코드재발급
                </button>
                <button
                  className="px-2.5 py-1.5 text-sm text-red-400 hover:text-red-300"
                  onClick={() => {
                    if (confirm("이 심사위원을 삭제할까요? 평가 기록도 삭제됩니다."))
                      act(() => deleteJudge(j.id));
                  }}
                >
                  삭제
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {judges.length === 0 && (
        <p className="text-white/40">심사위원을 추가하면 접속 코드가 자동 발급됩니다.</p>
      )}
    </div>
  );
}
