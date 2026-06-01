import Link from "next/link";
import { getParticipants, getSettings } from "@/lib/data";
import { getAudienceResults } from "@/lib/results";
import { createServiceClient } from "@/lib/supabase/server";
import AutoRefresh from "@/components/AutoRefresh";
import DashboardControls from "./DashboardControls";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [settings, participants, audience] = await Promise.all([
    getSettings(),
    getParticipants(),
    getAudienceResults(),
  ]);

  const sb = createServiceClient();
  const [{ count: raffleCount }, { count: submittedCount }] = await Promise.all([
    sb.from("raffle_entries").select("*", { count: "exact", head: true }),
    sb.from("evaluations").select("*", { count: "exact", head: true }).eq("submitted", true),
  ]);

  const totalVotes = audience.reduce((a, r) => a + r.votes, 0);
  const maxVotes = Math.max(1, ...audience.map((r) => r.votes));

  const stats = [
    { label: "총 투표 수", value: totalVotes },
    { label: "추첨 응모자", value: raffleCount ?? 0 },
    { label: "참가팀", value: participants.length },
    { label: "심사 제출", value: submittedCount ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={6} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-sm text-white/50">{s.label}</p>
            <p className="mt-1 text-3xl font-black tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <DashboardControls settings={settings} participants={participants} />

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">실시간 투표 현황</h2>
          <div className="flex gap-2 text-sm">
            <Link href="/display" target="_blank" className="text-brand-soft hover:underline">
              현황판 ↗
            </Link>
            <Link href="/reveal" target="_blank" className="text-brand-soft hover:underline">
              리빌 ↗
            </Link>
          </div>
        </div>
        <p className="mt-1 text-sm text-white/40">
          관객에게는 공개되지 않습니다 · 6초마다 자동 갱신
        </p>
        <ul className="mt-4 space-y-2">
          {audience.map((r, i) => (
            <li key={r.participant.id} className="flex items-center gap-3">
              <span className="w-5 text-right text-sm text-white/40">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="truncate font-medium">{r.participant.project_name}</span>
                  <span className="tabular-nums text-white/60">{r.votes}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${(r.votes / maxVotes) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
          {audience.length === 0 && (
            <li className="text-sm text-white/40">아직 참가팀이 없습니다.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
