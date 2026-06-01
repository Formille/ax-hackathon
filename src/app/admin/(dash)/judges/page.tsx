import { createServiceClient } from "@/lib/supabase/server";
import type { Judge } from "@/lib/types";
import JudgeManager from "./JudgeManager";

export const dynamic = "force-dynamic";

export default async function JudgesPage() {
  const sb = createServiceClient();
  const { data } = await sb
    .from("judges")
    .select("*")
    .order("created_at", { ascending: true });
  return <JudgeManager judges={(data ?? []) as Judge[]} />;
}
