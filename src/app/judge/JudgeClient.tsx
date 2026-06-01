"use client";

import { useEffect, useMemo, useState } from "react";
import type { Criterion } from "@/lib/types";
import { clearJudgeCode, getJudgeCode, setJudgeCode } from "@/lib/tokens";
import {
  getJudgeWorkspace,
  judgeLogin,
  saveEvaluation,
  type JudgeEvalState,
  type JudgeWorkspace,
} from "./actions";

type View = "loading" | "login" | "list" | "evaluate";

function weighted(criteria: Criterion[], scores: Record<string, number>) {
  let points = 0;
  let max = 0;
  for (const c of criteria) {
    points += (scores[c.id] ?? 0) * Number(c.weight);
    max += c.max_score * Number(c.weight);
  }
  const pct = max > 0 ? Math.round((points / max) * 100) : 0;
  return { points, max, pct };
}

export default function JudgeClient() {
  const [view, setView] = useState<View>("loading");
  const [code, setCode] = useState("");
  const [ws, setWs] = useState<JudgeWorkspace | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // draft for the participant being evaluated
  const [draftScores, setDraftScores] = useState<Record<string, number>>({});
  const [draftScoreComments, setDraftScoreComments] = useState<Record<string, string>>({});
  const [draftComment, setDraftComment] = useState("");

  useEffect(() => {
    const saved = getJudgeCode();
    if (!saved) return setView("login");
    getJudgeWorkspace(saved).then((res) => {
      if (res.ok) {
        setCode(saved);
        setWs(res.data);
        setView("list");
      } else {
        clearJudgeCode();
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
    const login = await judgeLogin(code);
    if (!login.ok) {
      setBusy(false);
      return flash(login.error);
    }
    const res = await getJudgeWorkspace(code);
    setBusy(false);
    if (!res.ok) return flash(res.error);
    setJudgeCode(code.trim());
    setWs(res.data);
    setView("list");
  }

  function openEvaluate(pid: string) {
    const ev = ws?.evaluations[pid];
    setActiveId(pid);
    setDraftScores({ ...(ev?.scores ?? {}) });
    setDraftScoreComments({ ...(ev?.scoreComments ?? {}) });
    setDraftComment(ev?.comment ?? "");
    setView("evaluate");
  }

  async function persist(submitted: boolean) {
    if (!ws || !activeId) return;
    setBusy(true);
    const res = await saveEvaluation({
      code,
      participantId: activeId,
      comment: draftComment,
      submitted,
      scores: ws.criteria.map((c) => ({
        criterionId: c.id,
        score: draftScores[c.id] ?? 0,
        comment: draftScoreComments[c.id],
      })),
    });
    setBusy(false);
    if (!res.ok) return flash(res.error);

    const next: JudgeEvalState = {
      comment: draftComment,
      submitted,
      scores: { ...draftScores },
      scoreComments: { ...draftScoreComments },
    };
    setWs({ ...ws, evaluations: { ...ws.evaluations, [activeId]: next } });
    flash(submitted ? "제출되었습니다 ✓" : "임시저장되었습니다");
    if (submitted) setView("list");
  }

  if (view === "loading") {
    return <div className="mt-24 text-center text-white/40">불러오는 중…</div>;
  }

  if (view === "login") {
    return (
      <section className="mt-12">
        <h1 className="text-2xl font-bold">심사위원 입장</h1>
        <p className="mt-2 text-white/55">개별 발급받은 심사위원 코드를 입력하세요.</p>
        <form onSubmit={handleLogin} className="card mt-6 space-y-4 p-5">
          <div>
            <label className="label">심사위원 코드</label>
            <input
              className="input font-mono tracking-wider"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="JUDGE-XXXX"
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

  if (!ws) return null;

  if (view === "list") {
    const submittedCount = ws.participants.filter(
      (p) => ws.evaluations[p.id]?.submitted,
    ).length;
    return (
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{ws.judge.name} 님</h1>
            <p className="text-sm text-white/55">
              {submittedCount}/{ws.participants.length} 팀 제출 완료
            </p>
          </div>
          <button
            className="btn-ghost text-sm"
            onClick={() => {
              clearJudgeCode();
              setWs(null);
              setCode("");
              setView("login");
            }}
          >
            로그아웃
          </button>
        </div>

        {!ws.judgingOpen && (
          <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
            심사가 마감되어 점수를 더 이상 수정할 수 없습니다.
          </div>
        )}

        <ul className="mt-5 space-y-3">
          {ws.participants.map((p) => {
            const ev = ws.evaluations[p.id];
            const w = ev ? weighted(ws.criteria, ev.scores) : null;
            const status = ev?.submitted
              ? { label: "제출완료", cls: "bg-accent/20 text-accent" }
              : ev
                ? { label: "임시저장", cls: "bg-gold/20 text-gold" }
                : { label: "미평가", cls: "bg-white/10 text-white/50" };
            return (
              <li key={p.id} className="card flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-brand-soft">{p.team_name}</p>
                  <h3 className="truncate text-lg font-bold">{p.project_name}</h3>
                  <span className={`pill mt-1 ${status.cls}`}>{status.label}</span>
                  {w && (
                    <span className="ml-2 text-sm text-white/50">{w.pct}점</span>
                  )}
                </div>
                <button className="btn-ghost shrink-0" onClick={() => openEvaluate(p.id)}>
                  {ev ? "수정" : "평가하기"}
                </button>
              </li>
            );
          })}
        </ul>
        <Toast message={toast} />
      </section>
    );
  }

  // view === "evaluate"
  const participant = ws.participants.find((p) => p.id === activeId)!;
  const w = weighted(ws.criteria, draftScores);
  const locked = !ws.judgingOpen;

  return (
    <section className="mt-6 pb-10">
      <button className="text-sm text-white/50" onClick={() => setView("list")}>
        ← 목록으로
      </button>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-xs text-brand-soft">{participant.team_name}</p>
          <h1 className="text-2xl font-bold">{participant.project_name}</h1>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-brand-soft">{w.pct}</p>
          <p className="text-xs text-white/40">가중 점수</p>
        </div>
      </div>
      {participant.tagline && (
        <p className="mt-1 text-sm text-white/55">{participant.tagline}</p>
      )}

      <div className="mt-6 space-y-5">
        {ws.criteria.map((c) => {
          const val = draftScores[c.id] ?? 0;
          return (
            <div key={c.id} className="card p-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h4 className="font-bold">{c.label}</h4>
                  {c.description && (
                    <p className="text-xs text-white/45">{c.description}</p>
                  )}
                </div>
                <span className="text-sm text-white/40">
                  가중치 ×{Number(c.weight)}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={c.max_score}
                  step={1}
                  value={val}
                  disabled={locked}
                  onChange={(e) =>
                    setDraftScores((s) => ({ ...s, [c.id]: Number(e.target.value) }))
                  }
                  className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-brand"
                />
                <span className="w-14 shrink-0 text-right text-lg font-bold tabular-nums">
                  {val}
                  <span className="text-sm font-normal text-white/40">
                    /{c.max_score}
                  </span>
                </span>
              </div>
              <input
                className="input mt-3 text-sm"
                placeholder="항목 코멘트 (선택)"
                value={draftScoreComments[c.id] ?? ""}
                disabled={locked}
                onChange={(e) =>
                  setDraftScoreComments((s) => ({ ...s, [c.id]: e.target.value }))
                }
              />
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <label className="label">총평 (선택)</label>
        <textarea
          className="input min-h-24"
          value={draftComment}
          disabled={locked}
          onChange={(e) => setDraftComment(e.target.value)}
          placeholder="이 팀에 대한 종합 의견을 남겨주세요."
        />
      </div>

      {!locked && (
        <div className="mt-6 flex gap-3">
          <button
            className="btn-ghost flex-1"
            disabled={busy}
            onClick={() => persist(false)}
          >
            임시저장
          </button>
          <button
            className="btn-primary flex-1"
            disabled={busy}
            onClick={() => persist(true)}
          >
            제출하기
          </button>
        </div>
      )}
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
