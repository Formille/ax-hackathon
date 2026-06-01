import "server-only";

import { createSupabaseServerClient } from "./supabase/server";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Returns the signed-in admin user, or null if not signed in / not allowlisted. */
export async function getAdminUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const allow = adminEmails();
  // Deny by default: an allowlist MUST be configured (ADMIN_EMAILS), and the
  // signed-in email must be on it.
  if (allow.length === 0) return null;
  if (!allow.includes(user.email.toLowerCase())) return null;
  return user;
}

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
