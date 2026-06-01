import { getParticipants, getSettings } from "@/lib/data";
import { getBaseUrl } from "@/lib/site";
import { PhasePill } from "@/components/ui";
import QrCode from "@/components/QrCode";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  const [settings, participants] = await Promise.all([
    getSettings(),
    getParticipants({ publishedOnly: true }),
  ]);
  const base = await getBaseUrl();
  const joinUrl = `${base}/vote`;
  const current = participants.find((p) => p.id === settings.current_participant_id) ?? null;

  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr] gap-6 px-8 py-8">
      <AutoRefresh seconds={8} />
      <header className="flex items-center justify-between">
        <p className="text-2xl font-black tracking-tight">⚡ {settings.event_name}</p>
        <PhasePill phase={settings.phase} />
      </header>

      <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <section>
          {current ? (
            <>
              <p className="text-lg font-semibold uppercase tracking-widest text-accent">
                ● 지금 발표 중
              </p>
              <p className="mt-3 text-xl text-brand-soft">{current.team_name}</p>
              <h1 className="mt-1 text-6xl font-black leading-tight">
                {current.project_name}
              </h1>
              {current.tagline && (
                <p className="mt-4 text-2xl text-white/60">{current.tagline}</p>
              )}
            </>
          ) : (
            <>
              <h1 className="text-6xl font-black leading-tight">
                지금 바로 <span className="text-brand-soft">투표</span>에
                <br />
                참여하세요
              </h1>
              <p className="mt-5 text-2xl text-white/55">
                휴대폰으로 QR 코드를 스캔하면 끝!
              </p>
            </>
          )}

          <div className="mt-10 flex flex-wrap gap-3 text-lg">
            <span className="rounded-xl bg-white/5 px-4 py-2">
              👥 참가 팀 <b className="text-white">{participants.length}</b>
            </span>
            <span className="rounded-xl bg-white/5 px-4 py-2">
              🗳️ 1인 최대 <b className="text-white">{settings.max_votes_per_voter}</b>표
            </span>
          </div>
        </section>

        <section className="flex flex-col items-center">
          <QrCode value={joinUrl} size={300} />
          <p className="mt-5 text-center text-2xl font-bold">스캔하여 참여</p>
          <p className="mt-1 break-all text-center font-mono text-white/50">{joinUrl}</p>
        </section>
      </div>
    </main>
  );
}
