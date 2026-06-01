"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Periodically re-fetches the server component tree (cheap live updates). */
export default function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}
