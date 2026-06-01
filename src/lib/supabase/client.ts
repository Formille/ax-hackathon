"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client using the public anon key (RLS-gated). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
