"use client";

import { useEffect, useState } from "react";
import type { Participant } from "@/lib/types";
import { getRaffleToken, getVoteToken } from "@/lib/tokens";
import {
  castVote,
  getMyVotes,
  markParticipated,
  registerRaffle,
  removeVote,
} from "./actions";

const REGISTERED_KEY = "ha_registered";

type Step = "loading" | "register" | "vote" | "done";

export default function VoteClient({
  participants,
  maxVotes,
  awardLabel,
}: {
  participants: Participant[];
  maxVotes: number;
  awardLabel: string;
}) {
  const [step, setStep] = useState<Step>("loading");
  const [name, setName] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const voteToken = getVoteToken();
    getRaffleToken(); // ensure created
    if (window.localStorage.getItem(REGISTERED_KEY) === "1") {
      getMyVotes(voteToken).then((ids) => {
        setSelected(new Set(ids));
        setStep("vote");
      });
    } else {
      setStep("register");
    }
  }, []);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return flash("이름을 입력해 주세요.");
    setBusy(true);
    const res = await registerRaffle({
      raffleToken: getRaffleToken(),
      name,
      affiliation,
    });
    setBusy(false);
    if (!res.ok) return flash(res.error);
    window.localStorage.setItem(REGISTERED_KEY, "1");
    setStep("vote");
  }

  async function toggle(participantId: string) {
    if (busy) return;
    const voteToken = getVoteToken();
    const isSelected = selected.has(participantId);

    if (isSelected) {
      setBusy(true);
      const res = await removeVote({ voteToken, participantId });
      setBusy(false);
      if (!res.ok) return flash(res.error);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
      return;
    }

    if (selected.size >= maxVotes) {
      return flash(`최대 ${maxVotes}팀까지 투표할 수 있어요.`);
    }

    setBusy(true);
    const res = await castVote({ voteToken, participantId });
    setBusy(false);
    if (!res.ok) return flash(res.error);

    const wasFirst = selected.size === 0;
    setSelected((prev) => new Set(prev).add(participantId));
    if (wasFirst) markParticipated(getRaffleToken());
  }

  if (step === "loading") {
    return <div className="mt-24 text-center text-white/40">불러오는 중…</div>;
  }

  if (step === "register") {
    return (
      <section className="mt-10">
        <h1 className="text-2xl font-bold">환영합니다 👋</h1>
        <p className="mt-2 text-white/55">
          이름을 남기면 <b className="text-white/80">경품 추첨</b>에 자동 응모됩니다.
          투표 내용과 신원은 서로 분리되어 저장돼요.
        </p>
        <form onSubmit={handleRegister} className="card mt-6 space-y-4 p-5">
          <div>
            <label className="label">이름 *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              autoFocus
            />
          </div>
          <div>
            <label className="label">소속 (선택)</label>
            <input
              className="input"
              value={affiliation}
              onChange={(e) => setAffiliation(e.target.value)}
              placeholder="OO팀 / OO학과"
            />
          </div>
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? "입장 중…" : "입장하고 투표 시작"}
          </button>
        </form>
        <Toast message={toast} />
      </section>
    );
  }

  if (step === "done") {
    return (
      <section className="mt-20 flex flex-col items-center text-center">
        <span className="text-6xl">🎉</span>
        <h1 className="mt-6 text-2xl font-bold">투표 완료!</h1>
        <p className="mt-2 max-w-sm text-white/55">
          소중한 {selected.size}표 감사합니다. 경품 추첨에 응모되었어요. 결과는 행사
          종료 후 공개됩니다.
        </p>
        <button className="btn-ghost mt-8" onClick={() => setStep("vote")}>
          다시 수정하기
        </button>
      </section>
    );
  }

  // step === "vote"
  const remaining = maxVotes - selected.size;
  return (
    <section className="mt-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">마음에 드는 팀에 투표하세요</h1>
      </div>
      <p className="mt-1 text-sm text-white/55">
        최대 <b className="text-white/80">{maxVotes}팀</b>까지 선택할 수 있어요. 가장
        많은 표를 받은 팀이 <b className="text-brand-soft">{awardLabel}</b>을 받습니다.
      </p>

      <ul className="mt-5 space-y-3">
        {participants.map((p) => {
          const on = selected.has(p.id);
          return (
            <li
              key={p.id}
              className={`card overflow-hidden transition ${
                on ? "border-brand ring-1 ring-brand/50" : ""
              }`}
            >
              <div className="flex gap-4 p-4">
                {p.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail_url}
                    alt={p.project_name}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-brand/15 text-2xl">
                    {p.project_name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-brand-soft">{p.team_name}</p>
                  <h3 className="truncate text-lg font-bold">{p.project_name}</h3>
                  {p.tagline && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-white/55">
                      {p.tagline}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggle(p.id)}
                  disabled={busy}
                  aria-pressed={on}
                  className={`${
                    on ? "btn-primary" : "btn-ghost"
                  } h-11 shrink-0 self-center px-4`}
                >
                  {on ? "✓ 선택됨" : "투표"}
                </button>
              </div>
              {p.description && (
                <details className="border-t border-white/10 px-4 py-2.5 text-sm text-white/55">
                  <summary className="cursor-pointer select-none text-white/70">
                    자세히 보기
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap">{p.description}</p>
                  {p.members && (
                    <p className="mt-2 text-xs text-white/40">팀원 · {p.members}</p>
                  )}
                  {p.demo_url && (
                    <a
                      href={p.demo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-brand-soft underline"
                    >
                      데모 링크 →
                    </a>
                  )}
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {/* sticky footer */}
      <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-sm text-white/60">
            {selected.size > 0 ? (
              <>
                <b className="text-white">{selected.size}팀</b> 선택 · {remaining}표 남음
              </>
            ) : (
              "아직 선택한 팀이 없어요"
            )}
          </span>
          <button
            className="btn-primary"
            onClick={() => setStep("done")}
            disabled={selected.size === 0}
          >
            투표 완료
          </button>
        </div>
      </div>

      <Toast message={toast} />
    </section>
  );
}

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="animate-pop-in fixed inset-x-0 bottom-24 z-50 mx-auto w-fit rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-lg">
      {message}
    </div>
  );
}
