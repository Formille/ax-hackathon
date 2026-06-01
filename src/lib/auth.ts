import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ha_admin";

/** Derived bearer token stored in the admin cookie (no secret is stored raw). */
export function adminToken(): string | null {
  const pass = process.env.ADMIN_PASSCODE;
  if (!pass) return null;
  return createHmac("sha256", pass).update("hackathon-arena-admin-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Constant-time check of a submitted passcode against ADMIN_PASSCODE. */
export function checkPasscode(input: string): boolean {
  const pass = process.env.ADMIN_PASSCODE ?? "";
  if (!pass) return false;
  return safeEqual(input, pass);
}

/**
 * Returns the admin "user" if a valid admin cookie is present, else null.
 * Deny by default: if ADMIN_PASSCODE is unset, no one is an admin.
 */
export async function getAdminUser(): Promise<{ email: string | null } | null> {
  const token = adminToken();
  if (!token) return null;
  const store = await cookies();
  const cookie = store.get(ADMIN_COOKIE)?.value;
  if (!cookie) return null;
  return safeEqual(cookie, token) ? { email: null } : null;
}

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
