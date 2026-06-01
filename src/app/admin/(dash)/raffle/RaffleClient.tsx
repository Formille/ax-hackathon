"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RaffleEntry } from "@/lib/types";
import { drawRaffle, raffleCsv, resetRaffle } from "../../actions";

export default function RaffleClient({ entries }: { entries: RaffleEntry[] }) {
  const router = useRouter();
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{
    seed: string;
    winners: { id: string; name: string; affiliation: string | null }[];
  } | null>(null);

  const participated = entries.filter((e) => e.participated);
  const winners = entries.filter((e) => e.is_winner);
  const eligible = participated.filter((e) => !e.is_winner).length;

  async function draw() {
    setBusy(true);
    setError(null);
    const res = await drawRaffle(count);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setLast({ seed: res.seed, winners: res.winners });
    router.refresh();
  }

  async function reset() {
    if (!confirm("당첨 결과를 모두 초기화할까요?")) return;
    setBusy(true);
    await resetRaffle();
    setBusy(false);
    setLast(null);
    router.refresh();
  }

  async function download() {
    const csv = await raffleCsv();
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raffle-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">경품 추첨</h1>
        <p className="text-sm text-white/50">
          실제 투표에 참여한 응모자 중에서 무작위로 추첨합니다.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="총 응모" value={entries.length} />
        <Stat label="참여(추첨대상)" value={participated.length} />
        <Stat label="당첨" value={winners.length} />
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">뽑을 인원</label>
          <input
            type="number"
            min={1}
            max={Math.max(1, eligible)}
            className="input w-28"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>
        <button className="btn-gold" disabled={busy || eligible === 0} onClick={draw}>
          🎲 추첨하기
        </button>
        <button className="btn-ghost" disabled={busy} onClick={download}>
          CSV 내보내기
        </button>
        <button
          className="btn-ghost ml-auto text-white/60"
          disabled={busy || winners.length === 0}
          onClick={reset}
        >
          당첨 초기화
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {eligible === 0 && (
        <p className="text-sm text-white/40">
          추첨 대상이 없습니다. (투표에 참여한 응모자가 필요)
        </p>
      )}

      {last && (
        <div className="animate-pop-in card border-gold/40 bg-gold/5 p-5">
          <p className="text-sm font-bold text-gold">🎉 당첨자</p>
          <ul className="mt-2 space-y-1">
            {last.winners.map((w) => (
              <li key={w.id} className="text-lg font-bold">
                {w.name}
                {w.affiliation && (
                  <span className="ml-2 text-sm font-normal text-white/50">
                    {w.affiliation}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-xs text-white/40">seed: {last.seed}</p>
        </div>
      )}

      <section className="card overflow-x-auto p-5">
        <h2 className="font-bold">응모자 ({entries.length})</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/50">
              <th className="py-2 pr-2">이름</th>
              <th className="py-2 pr-2">소속</th>
              <th className="py-2 pr-2 text-center">참여</th>
              <th className="py-2 pr-2 text-center">당첨</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-white/5">
                <td className="py-2 pr-2 font-medium">{e.name}</td>
                <td className="py-2 pr-2 text-white/60">{e.affiliation ?? "-"}</td>
                <td className="py-2 pr-2 text-center">{e.participated ? "✓" : "-"}</td>
                <td className="py-2 pr-2 text-center">
                  {e.is_winner ? <span className="text-gold">🏅</span> : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="mt-3 text-sm text-white/40">아직 응모자가 없습니다.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}
