import { createServiceClient } from "@/lib/supabase/server";
import type { RaffleEntry } from "@/lib/types";
import RaffleClient from "./RaffleClient";

export const dynamic = "force-dynamic";

export default async function RafflePage() {
  const sb = createServiceClient();
  const { data } = await sb
    .from("raffle_entries")
    .select("*")
    .order("created_at", { ascending: true });
  return <RaffleClient entries={(data ?? []) as RaffleEntry[]} />;
}
