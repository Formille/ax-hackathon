import Link from "next/link";
import { getSettings } from "@/lib/data";
import { Logo, PhasePill } from "@/components/ui";

export const dynamic = "force-dynamic";

const TILES = [
  {
    href: "/vote",
    emoji: "🗳️",
    title: "투표하기",
    desc: "관객 투표 · 추첨 응모",
    ring: "hover:border-brand/60",
  },
  {
    href: "/judge",
    emoji: "⚖️",
    title: "심사하기",
    desc: "심사위원 코드로 입장",
    ring: "hover:border-accent/60",
  },
  {
    href: "/team",
    emoji: "👥",
    title: "참가팀",
    desc: "내 정보·스크린샷 관리",
    ring: "hover:border-gold/60",
  },
  {
    href: "/display",
    emoji: "📺",
    title: "현황판 · QR",
    desc: "대형 화면 / 참여 QR",
    ring: "hover:border-gold/60",
  },
  {
    href: "/admin",
    emoji: "🛠️",
    title: "관리자",
    desc: "행사 운영 · 결과",
    ring: "hover:border-white/40",
  },
];

export default async function Home() {
  const settings = await getSettings();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-10">
      <header className="flex items-center justify-between">
        <Logo />
        <PhasePill phase={settings.phase} />
      </header>

      <div className="flex flex-1 flex-col justify-center py-16">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-soft">
          Live Hackathon
        </p>
        <h1 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">
          {settings.event_name}
        </h1>
        <p className="mt-4 max-w-lg text-white/60">
          관객 투표, 심사위원 평가, 경품 추첨까지 — 행사 진행에 필요한 모든 것을 한
          화면에서.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4">
          {TILES.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`card group flex flex-col gap-3 p-5 transition ${t.ring}`}
            >
              <span className="text-3xl">{t.emoji}</span>
              <span>
                <span className="block text-lg font-bold">{t.title}</span>
                <span className="block text-sm text-white/50">{t.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <footer className="text-center text-xs text-white/30">
        Hackathon Arena · Vercel × Supabase
      </footer>
    </main>
  );
}
