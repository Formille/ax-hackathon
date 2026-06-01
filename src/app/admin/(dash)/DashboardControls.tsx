"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Participant, Phase, Settings } from "@/lib/types";
import { PHASE_LABELS } from "@/lib/types";
import { cn } from "@/components/ui";
import {
  setCurrentParticipant,
  setJudgingOpen,
  setPhase,
  updateEventSettings,
} from "../actions";

const PHASES: Phase[] = ["draft", "voting", "closed", "revealed"];

export default function DashboardControls({
  settings,
  participants,
}: {
  settings: Settings;
  participants: Pick<Participant, "id" | "team_name" | "project_name">[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [eventName, setEventName] = useState(settings.event_name);
  const [maxVotes, setMaxVotes] = useState(settings.max_votes_per_voter);
  const [awardLabel, setAwardLabel] = useState(settings.popularity_award_label);
  const [saved, setSaved] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    await fn();
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {/* phase */}
      <section className="card p-5">
        <h2 className="font-bold">진행 상태</h2>
        <p className="mt-1 text-sm text-white/50">
          관객 화면과 투표 가능 여부가 이 상태에 따라 바뀝니다.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {PHASES.map((p) => (
            <button
              key={p}
              disabled={busy}
              onClick={() => run(() => setPhase(p))}
              className={cn(
                "rounded-xl px-3 py-3 text-sm font-bold transition",
                settings.phase === p
                  ? "bg-brand text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10",
              )}
            >
              {PHASE_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
          <span className="text-sm">
            심사 입력{" "}
            <b className={settings.judging_open ? "text-accent" : "text-gold"}>
              {settings.judging_open ? "열림" : "마감"}
            </b>
          </span>
          <button
            disabled={busy}
            onClick={() => run(() => setJudgingOpen(!settings.judging_open))}
            className="btn-ghost px-3 py-1.5 text-sm"
          >
            {settings.judging_open ? "심사 마감" : "심사 열기"}
          </button>
        </div>
      </section>

      {/* now presenting */}
      <section className="card p-5">
        <h2 className="font-bold">지금 발표 중</h2>
        <p className="mt-1 text-sm text-white/50">현황판(/display)에 크게 표시됩니다.</p>
        <select
          className="input mt-4"
          value={settings.current_participant_id ?? ""}
          disabled={busy}
          onChange={(e) => run(() => setCurrentParticipant(e.target.value || null))}
        >
          <option value="">— 없음 —</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.project_name} ({p.team_name})
            </option>
          ))}
        </select>
      </section>

      {/* event settings */}
      <section className="card p-5 md:col-span-2">
        <h2 className="font-bold">행사 설정</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">행사 이름</label>
            <input
              className="input"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">1인 최대 투표 수</label>
            <input
              type="number"
              min={1}
              max={50}
              className="input"
              value={maxVotes}
              onChange={(e) => setMaxVotes(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">관객상 이름</label>
            <input
              className="input"
              value={awardLabel}
              onChange={(e) => setAwardLabel(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            disabled={busy}
            className="btn-primary"
            onClick={() =>
              run(async () => {
                await updateEventSettings({
                  event_name: eventName,
                  max_votes_per_voter: maxVotes,
                  popularity_award_label: awardLabel,
                });
                setSaved(true);
                setTimeout(() => setSaved(false), 1500);
              })
            }
          >
            저장
          </button>
          {saved && <span className="text-sm text-accent">저장됨 ✓</span>}
        </div>
      </section>
    </div>
  );
}
