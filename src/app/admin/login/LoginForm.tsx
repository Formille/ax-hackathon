"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") ? "인증에 실패했습니다. 다시 시도해 주세요." : null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="card p-6 text-center">
        <span className="text-4xl">📬</span>
        <h1 className="mt-4 text-xl font-bold">메일을 확인하세요</h1>
        <p className="mt-2 text-sm text-white/55">
          <b className="text-white/80">{email}</b> 으로 로그인 링크를 보냈습니다. 메일의
          링크를 클릭하면 관리자로 입장합니다.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div>
        <h1 className="text-xl font-bold">관리자 로그인</h1>
        <p className="mt-1 text-sm text-white/55">
          허용된 이메일로 매직 링크를 보내드립니다.
        </p>
      </div>
      <div>
        <label className="label">이메일</label>
        <input
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          required
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="btn-primary w-full" disabled={busy}>
        {busy ? "전송 중…" : "로그인 링크 받기"}
      </button>
    </form>
  );
}
