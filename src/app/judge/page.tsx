import { getSettings } from "@/lib/data";
import { Logo } from "@/components/ui";
import JudgeClient from "./JudgeClient";

export const dynamic = "force-dynamic";

export default async function JudgePage() {
  const settings = await getSettings();
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8 md:max-w-5xl xl:max-w-6xl">
      <header className="flex items-center justify-between">
        <Logo name={settings.event_name} />
        <span className="pill bg-accent/20 text-accent">심사위원</span>
      </header>
      <JudgeClient />
    </main>
  );
}
