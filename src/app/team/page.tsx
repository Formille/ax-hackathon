import { getSettings } from "@/lib/data";
import { Logo } from "@/components/ui";
import TeamClient from "./TeamClient";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const settings = await getSettings();
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      <header className="flex items-center justify-between">
        <Logo name={settings.event_name} />
        <span className="pill bg-gold/20 text-gold">참가팀</span>
      </header>
      <TeamClient />
    </main>
  );
}
