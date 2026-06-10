import Link from "next/link";
import type { Phase } from "@/lib/types";
import { PHASE_LABELS } from "@/lib/types";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const PHASE_STYLE: Record<Phase, string> = {
  draft: "bg-white/10 text-white/70",
  voting: "bg-accent/20 text-accent",
  closed: "bg-gold/20 text-gold",
  revealed: "bg-brand/25 text-brand-soft",
};

export function PhasePill({ phase }: { phase: Phase }) {
  return (
    <span className={cn("pill", PHASE_STYLE[phase])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {PHASE_LABELS[phase]}
    </span>
  );
}

export function Logo({ name }: { name?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg font-black text-white shadow-lg shadow-brand/30">
        ⚡
      </span>
      <span className="text-lg font-bold tracking-tight">{name ?? "해커톤 아레나"}</span>
    </Link>
  );
}
