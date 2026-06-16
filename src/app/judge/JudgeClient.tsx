"use client";

import { useEffect, useState } from "react";
import type { Criterion } from "@/lib/types";
import ScreenshotCarousel from "@/components/ScreenshotCarousel";
import { cn } from "@/components/ui";
import { clearJudgeCode, getJudgeCode, setJudgeCode } from "@/lib/tokens";
import {
  getJudgeWorkspace,
  judgeLogin,
  saveEvaluation,
  type JudgeEvalState,
  type JudgeWorkspace,
} from "./actions";

type View = "loading" | "login" | "workspace";

function weighted(criteria: Criterion[], scores: Record<string, number>) {
  let points = 0;
  let max = 0;
  for (const c of criteria) {
    points += (scores[c.id] ?? 0) * Number(c.weight);
    max += c.max_score * Number(c.weight);
  }
  return { pct: max > 0 ? Math.round((points / max) * 100) : 0 };
}

function statusOf(ev?: JudgeEvalState) {
  if (ev?.submitted) return { label: "제출완료", cls: "bg-accent/20 text-accent" };
  if (ev) return { label: "임시저장", cls: "bg-gold/20 text-gold" };
  return { label: "미평가", cls: "bg-white/10 text-white/50" };
}

export default function JudgeClient() {
  const [view, setView] = useState<View>("loading");
  const [code, setCode] = useState("");
  const [ws, setWs] = useState<JudgeWorkspace | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

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
        setView("workspace");
      } else {
        clearJudgeCode();
        setView("login");
      }
    });
  }, []);

  // keep "now presenting" + statuses fresh during the event
  useEffect(() => {
    if (view !== "workspace" || !code) return;
    const id = window.setInterval(() => {
      getJudgeWorkspace(code).then((res) => {
        if (res.ok) setWs(res.data);
      });
    }, 25000);
    return () => window.clearInterval(id);
  }, [view, code]);

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
    setView("workspace");
  }

  function select(pid: string) {
    const ev = ws?.evaluations[pid];
    setSelectedId(pid);
    setDraftScores({ ...(ev?.scores ?? {}) });
    setDraftScoreComments({ ...(ev?.scoreComments ?? {}) });
    setDraftComment(ev?.comment ?? "");
  }

  async function persist(submitted: boolean) {
    if (!ws || !selectedId) return;
    setBusy(true);
    const res = await saveEvaluation({
      code,
      participantId: selectedId,
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
    setWs({ ...ws, evaluations: { ...ws.evaluations, [selectedId]: next } });
    flash(submitted ? "제출되었습니다 ✓" : "임시저장되었습니다");
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

  const submittedCount = ws.participants.filter((p) => ws.evaluations[p.id]?.submitted).length;
  const locked = !ws.judgingOpen;
  const sel = selectedId ? ws.participants.find((p) => p.id === selectedId) ?? null : null;

  // current presenter floats to the top of the list
  const currentId = ws.currentParticipantId;
  const cur = currentId ? ws.participants.find((p) => p.id === currentId) : null;
  const orderedParticipants = cur
    ? [cur, ...ws.participants.filter((p) => p.id !== currentId)]
    : ws.participants;

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{ws.judge.name} 님</h1>
          <p className="text-sm text-white/55">
            {submittedCount}/{ws.participants.length} 팀 제출 완료
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={cn("text-sm", showSummary ? "btn-primary" : "btn-ghost")}
            onClick={() => setShowSummary((s) => !s)}
          >
            {showSummary ? "평가로 돌아가기" : "📊 점수 요약"}
          </button>
          <button
            className="btn-ghost text-sm"
            onClick={() => {
              clearJudgeCode();
              setWs(null);
              setCode("");
              setSelectedId(null);
              setView("login");
            }}
          >
            로그아웃
          </button>
        </div>
      </div>

      {locked && (
        <div className="mt-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
          심사가 마감되어 점수를 더 이상 수정할 수 없습니다.
        </div>
      )}

      {showSummary ? (
        <div className="mt-5">
          <Summary ws={ws} />
        </div>
      ) : (
      <div className="mt-5 md:grid md:grid-cols-[300px_1fr] md:gap-6 lg:grid-cols-[340px_1fr] lg:gap-8">
        {/* left: participant list */}
        <aside
          className={cn(
            "md:sticky md:top-4 md:max-h-[85vh] md:overflow-y-auto",
            sel ? "hidden md:block" : "block",
          )}
        >
          <ul className="space-y-2">
            {orderedParticipants.map((p) => {
              const ev = ws.evaluations[p.id];
              const st = statusOf(ev);
              const w = ev ? weighted(ws.criteria, ev.scores) : null;
              const active = p.id === selectedId;
              const isCurrent = p.id === currentId;
              return (
                <li key={p.id}>
                  <button
                    onClick={() => select(p.id)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition",
                      active
                        ? "border-brand bg-brand/10"
                        : isCurrent
                          ? "border-accent bg-accent/5 ring-1 ring-accent/40"
                          : "border-white/10 bg-ink-card hover:border-white/25",
                    )}
                  >
                    {isCurrent && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-bold text-accent">
                        🔴 지금 발표 중
                      </span>
                    )}
                    <p className="truncate font-bold">{p.project_name}</p>
                    {p.tagline && (
                      <p className="truncate text-xs text-white/45">{p.tagline}</p>
                    )}
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className={cn("pill", st.cls)}>{st.label}</span>
                      {w && (
                        <span className="text-xs font-bold text-brand-soft">{w.pct}점</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* right: detail + evaluation */}
        <main className={cn(sel ? "block" : "hidden md:block")}>
          {!sel ? (
            <div className="hidden h-full place-items-center rounded-2xl border border-dashed border-white/10 p-10 text-center text-white/40 md:grid">
              왼쪽에서 평가할 팀을 선택하세요.
            </div>
          ) : (
            <Detail
              key={sel.id}
              ws={ws}
              participantId={sel.id}
              locked={locked}
              draftScores={draftScores}
              draftScoreComments={draftScoreComments}
              draftComment={draftComment}
              setDraftScores={setDraftScores}
              setDraftScoreComments={setDraftScoreComments}
              setDraftComment={setDraftComment}
              busy={busy}
              onBack={() => setSelectedId(null)}
              onSave={persist}
            />
          )}
        </main>
      </div>
      )}
      <Toast message={toast} />
    </section>
  );
}

function Detail({
  ws,
  participantId,
  locked,
  draftScores,
  draftScoreComments,
  draftComment,
  setDraftScores,
  setDraftScoreComments,
  setDraftComment,
  busy,
  onBack,
  onSave,
}: {
  ws: JudgeWorkspace;
  participantId: string;
  locked: boolean;
  draftScores: Record<string, number>;
  draftScoreComments: Record<string, string>;
  draftComment: string;
  setDraftScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setDraftScoreComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setDraftComment: (v: string) => void;
  busy: boolean;
  onBack: () => void;
  onSave: (submitted: boolean) => void;
}) {
  const p = ws.participants.find((x) => x.id === participantId)!;
  const shots = ws.screenshots[participantId] ?? [];
  const w = weighted(ws.criteria, draftScores);
  const totalW = ws.criteria.reduce((a, c) => a + Number(c.weight), 0) || 1;

  return (
    <div className="pb-10">
      <button className="mb-3 text-sm text-white/50 md:hidden" onClick={onBack}>
        ← 목록으로
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-brand-soft">{p.team_name}</p>
          <h2 className="text-2xl font-bold">{p.project_name}</h2>
          {p.tagline && <p className="mt-1 text-sm text-white/55">{p.tagline}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-black text-brand-soft">{w.pct}</p>
          <p className="text-xs text-white/40">가중 점수</p>
        </div>
      </div>

      {shots.length > 0 && <ScreenshotCarousel shots={shots} />}

      {p.features && (
        <div className="mt-4 card p-4">
          <h3 className="text-sm font-bold text-white/80">주요 기능</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">{p.features}</p>
        </div>
      )}
      {p.description && (
        <div className="mt-3 card p-4">
          <h3 className="text-sm font-bold text-white/80">상세 소개</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">{p.description}</p>
        </div>
      )}
      {(p.members || p.demo_url) && (
        <p className="mt-3 text-xs text-white/40">
          {p.members && <>팀원 · {p.members}</>}
          {p.members && p.demo_url && "　"}
          {p.demo_url && (
            <a href={p.demo_url} target="_blank" rel="noreferrer" className="text-brand-soft underline">
              데모 링크 →
            </a>
          )}
        </p>
      )}

      <h3 className="mt-6 font-bold">평가</h3>
      <div className="mt-2 space-y-4">
        {ws.criteria.map((c) => {
          const val = draftScores[c.id] ?? 0;
          return (
            <div key={c.id} className="card p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-bold">{c.label}</h4>
                <span className="shrink-0 text-sm text-white/40">
                  비중 {Math.round((Number(c.weight) / totalW) * 100)}%
                </span>
              </div>
              {(c.level_low || c.level_mid || c.level_high) && (
                <div className="mt-2 grid gap-1.5 text-xs sm:grid-cols-3">
                  {[
                    { t: "낮음", v: c.level_low, cls: "text-white/45" },
                    { t: "보통", v: c.level_mid, cls: "text-gold/80" },
                    { t: "탁월", v: c.level_high, cls: "text-accent" },
                  ].map(
                    (lv) =>
                      lv.v && (
                        <div key={lv.t} className="rounded-lg bg-white/5 p-2">
                          <span className={cn("font-bold", lv.cls)}>{lv.t}</span>
                          <p className="mt-0.5 text-white/50">{lv.v}</p>
                        </div>
                      ),
                  )}
                </div>
              )}
              {c.description && <p className="mt-2 text-xs text-white/45">{c.description}</p>}
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
                  className="h-6 flex-1 cursor-pointer accent-brand"
                />
                <span className="w-14 shrink-0 text-right text-lg font-bold tabular-nums">
                  {val}
                  <span className="text-sm font-normal text-white/40">/{c.max_score}</span>
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
          <button className="btn-ghost flex-1" disabled={busy} onClick={() => onSave(false)}>
            임시저장
          </button>
          <button className="btn-primary flex-1" disabled={busy} onClick={() => onSave(true)}>
            제출하기
          </button>
        </div>
      )}
    </div>
  );
}

function Summary({ ws }: { ws: JudgeWorkspace }) {
  const totalW = ws.criteria.reduce((a, c) => a + Number(c.weight), 0) || 1;
  return (
    <div className="card overflow-x-auto p-4">
      <h3 className="font-bold">내 평가 점수</h3>
      <p className="mt-1 text-xs text-white/45">
        제출·임시저장한 점수를 한눈에 확인하세요.
      </p>
      <table className="mt-3 w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-white/50">
            <th className="py-2 pr-2">팀</th>
            {ws.criteria.map((c) => (
              <th key={c.id} className="py-2 pr-2 text-center">
                {c.label}
                <span className="block text-[10px] font-normal text-white/30">
                  {Math.round((Number(c.weight) / totalW) * 100)}%
                </span>
              </th>
            ))}
            <th className="py-2 pr-2 text-right">종합</th>
            <th className="py-2 pl-2 text-right">상태</th>
          </tr>
        </thead>
        <tbody>
          {ws.participants.map((p) => {
            const ev = ws.evaluations[p.id];
            const st = statusOf(ev);
            const pct = ev ? weighted(ws.criteria, ev.scores).pct : null;
            return (
              <tr key={p.id} className="border-b border-white/5">
                <td className="py-2 pr-2">
                  <span className="font-medium">{p.project_name}</span>
                  <span className="block text-xs text-white/40">{p.team_name}</span>
                </td>
                {ws.criteria.map((c) => (
                  <td key={c.id} className="py-2 pr-2 text-center tabular-nums text-white/70">
                    {ev ? (ev.scores[c.id] ?? 0) : "-"}
                  </td>
                ))}
                <td className="py-2 pr-2 text-right font-bold tabular-nums">
                  {pct != null ? pct : "-"}
                </td>
                <td className="py-2 pl-2 text-right">
                  <span className={cn("pill", st.cls)}>{st.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
