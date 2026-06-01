import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { Logo, PhasePill } from "@/components/ui";
import AdminNav from "../AdminNav";

export const dynamic = "force-dynamic";

export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const settings = await getSettings();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/85 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between">
            <Logo name={settings.event_name} />
            <PhasePill phase={settings.phase} />
          </div>
          <div className="mt-3">
            <AdminNav email={user.email ?? ""} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
