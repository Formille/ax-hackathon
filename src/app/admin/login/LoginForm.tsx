"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPasscode } from "../auth-actions";

export default function LoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signInWithPasscode(passcode);
    if (!res.ok) {
      setBusy(false);
      return setError(res.error ?? "로그인에 실패했습니다.");
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">관리자 로그인</h1>
        <p className="mt-1 text-sm text-white/55">관리자 비밀번호를 입력하세요.</p>
      </div>
      <div>
        <label className="label">비밀번호</label>
        <input
          type="password"
          className="input"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="••••••••"
          autoFocus
          required
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "확인 중…" : "입장"}
      </button>
    </form>
  );
}
