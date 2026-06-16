import Link from "next/link";
import { getParticipants, getScreenshotsByParticipant, getSettings } from "@/lib/data";
import { Logo, PhasePill } from "@/components/ui";
import VoteClient from "./VoteClient";

export const dynamic = "force-dynamic";

export default async function VotePage() {
  const [settings, participants, screenshots] = await Promise.all([
    getSettings(),
    getParticipants({ publishedOnly: true }),
    getScreenshotsByParticipant(),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pb-28 pt-8">
      <header className="flex items-center justify-between">
        <Logo name={settings.event_name} />
        <PhasePill phase={settings.phase} />
      </header>

      {settings.phase === "draft" && (
        <CenterCard
          emoji="⏳"
          title="곧 시작합니다"
          desc="투표는 행사 진행에 맞춰 열립니다. 잠시만 기다려 주세요."
        />
      )}

      {settings.phase === "voting" && (
        <VoteClient
          participants={participants}
          maxVotes={settings.max_votes_per_voter}
          awardLabel={settings.popularity_award_label}
          screenshots={screenshots}
          currentId={settings.current_participant_id}
        />
      )}

      {settings.phase === "closed" && (
        <CenterCard
          emoji="🔒"
          title="투표가 마감되었습니다"
          desc="결과 공개를 기다려 주세요. 추첨 응모도 함께 마감되었습니다."
        />
      )}

      {settings.phase === "revealed" && (
        <CenterCard
          emoji="🎉"
          title="결과가 공개되었습니다"
          desc="지금 바로 결과를 확인해 보세요."
          action={
            <Link href="/reveal" className="btn-primary mt-6">
              결과 보기 →
            </Link>
          }
        />
      )}
    </main>
  );
}

function CenterCard({
  emoji,
  title,
  desc,
  action,
}: {
  emoji: string;
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-24 flex flex-col items-center text-center">
      <span className="text-6xl">{emoji}</span>
      <h1 className="mt-6 text-2xl font-bold">{title}</h1>
      <p className="mt-2 max-w-sm text-white/55">{desc}</p>
      {action}
    </div>
  );
}
