"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";
import { signOut } from "./auth-actions";

const LINKS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/participants", label: "참가팀" },
  { href: "/admin/rubric", label: "심사기준" },
  { href: "/admin/judges", label: "심사위원" },
  { href: "/admin/results", label: "결과" },
  { href: "/admin/raffle", label: "추첨" },
];

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
              active ? "bg-brand text-white" : "text-white/60 hover:bg-white/10",
            )}
          >
            {l.label}
          </Link>
        );
      })}
      <span className="ml-auto hidden text-xs text-white/35 sm:inline">{email}</span>
      <form action={signOut}>
        <button className="rounded-lg px-3 py-1.5 text-sm text-white/50 hover:bg-white/10 hover:text-white">
          로그아웃
        </button>
      </form>
    </nav>
  );
}
