"use client";

import { useEffect, useRef, useState } from "react";
import type { ScreenshotView } from "@/lib/types";

export default function ScreenshotCarousel({
  shots,
}: {
  shots: ScreenshotView[];
}) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef<number | null>(null);

  const idx = shots.length ? Math.min(i, shots.length - 1) : 0;
  const go = (d: number) => setI((p) => (p + d + shots.length) % shots.length);

  // close lightbox on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shots.length]);

  if (shots.length === 0) return null;
  const cur = shots[idx];

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
          onClick={() => setOpen(true)}
          className="max-h-80 w-full cursor-zoom-in bg-black object-contain"
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

      {/* lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
          >
            ✕
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cur.url}
            alt={cur.caption ?? `스크린샷 ${idx + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[95vw] rounded-lg object-contain"
          />

          {shots.length > 1 && (
            <>
              <button
                type="button"
                aria-label="이전"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="다음"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-3xl text-white hover:bg-white/20"
              >
                ›
              </button>
            </>
          )}

          <div
            className="mt-3 text-center text-sm text-white/70"
            onClick={(e) => e.stopPropagation()}
          >
            {cur.caption && <p>{cur.caption}</p>}
            {shots.length > 1 && (
              <p className="mt-0.5 text-white/40">
                {idx + 1} / {shots.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
