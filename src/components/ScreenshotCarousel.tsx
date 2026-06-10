"use client";

import { useRef, useState } from "react";
import type { ScreenshotView } from "@/lib/types";

export default function ScreenshotCarousel({
  shots,
}: {
  shots: ScreenshotView[];
}) {
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);

  if (shots.length === 0) return null;
  const idx = Math.min(i, shots.length - 1);
  const cur = shots[idx];
  const go = (d: number) => setI((p) => (p + d + shots.length) % shots.length);

  return (
    <div className="mt-2">
      <div
        className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30"
        onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (startX.current === null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          startX.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cur.url}
          alt={cur.caption ?? `스크린샷 ${idx + 1}`}
          className="max-h-80 w-full bg-black object-contain"
        />
        {shots.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="이전"
              className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="다음"
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              ›
            </button>
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              {idx + 1}/{shots.length}
            </span>
          </>
        )}
      </div>
      {cur.caption && (
        <p className="mt-1.5 text-center text-sm text-white/60">{cur.caption}</p>
      )}
      {shots.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {shots.map((s, k) => (
            <button
              key={s.id}
              type="button"
              aria-label={`${k + 1}번 스크린샷`}
              onClick={() => setI(k)}
              className={`h-1.5 rounded-full transition-all ${
                k === idx ? "w-5 bg-brand" : "w-1.5 bg-white/25"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
