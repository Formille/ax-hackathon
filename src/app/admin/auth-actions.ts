"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminToken, checkPasscode } from "@/lib/auth";

export async function signInWithPasscode(
  passcode: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!checkPasscode(passcode.trim())) {
    return { ok: false, error: "비밀번호가 올바르지 않습니다." };
  }
  const token = adminToken();
  if (!token) {
    return { ok: false, error: "서버에 ADMIN_PASSCODE가 설정되지 않았습니다." };
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return { ok: true };
}

export async function signOut() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
