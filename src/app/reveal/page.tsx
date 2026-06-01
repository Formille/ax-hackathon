import Link from "next/link";
import { getSettings } from "@/lib/data";
import { getAudienceResults } from "@/lib/results";
import { Logo, PhasePill } from "@/components/ui";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function RevealPage() {
  const settings = await getSettings();

  if (settings.phase !== "revealed") {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <AutoRefresh seconds={5} />
          <span className="text-6xl">🥁</span>
          <h1 className="mt-6 text-3xl font-bold">결과 집계 중…</h1>
          <p className="mt-2 text-white/55">
            곧 결과가 공개됩니다. 이 화면은 자동으로 갱신돼요.
          </p>
          <Link href="/" className="btn-ghost mt-8">
            홈으로
          </Link>
        </div>
      </main>
    );
  }

  const results = await getAudienceResults();
  const max = Math.max(1, ...results.map((r) => r.votes));
  const winner = results[0] && results[0].votes > 0 ? results[0] : null;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
      <header className="flex items-center justify-between">
        <Logo name={settings.event_name} />
        <PhasePill phase={settings.phase} />
      </header>

      {winner && (
        <section className="animate-pop-in mt-8 overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/20 to-transparent p-8 text-center">
          <p className="text-lg font-bold tracking-widest text-gold">
            🏆 {settings.popularity_award_label}
          </p>
          <p className="mt-3 text-sm text-brand-soft">{winner.participant.team_name}</p>
          <h1 className="mt-1 text-4xl font-black">{winner.participant.project_name}</h1>
          <p className="mt-3 text-2xl font-bold text-gold">{winner.votes}표</p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-bold">관객 투표 결과</h2>
        <ul className="mt-4 space-y-2.5">
          {results.map((r, i) => (
            <li key={r.participant.id} className="card p-3">
              <div className="flex items-center gap-3">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-black ${
                    i === 0 ? "bg-gold text-ink" : "bg-white/10 text-white/60"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-bold">
                      {r.participant.project_name}
                      <span className="ml-2 text-xs font-normal text-white/40">
                        {r.participant.team_name}
                      </span>
                    </p>
                    <span className="shrink-0 text-sm font-bold tabular-nums">
                      {r.votes}표
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`animate-grow-bar h-full origin-left rounded-full ${
                        i === 0 ? "bg-gold" : "bg-brand"
                      }`}
                      style={{ width: `${(r.votes / max) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-center text-sm text-white/40">
        심사위원상은 시상식에서 발표됩니다 🎬
      </p>
    </main>
  );
}
