"use client";

import { QRCodeSVG } from "qrcode.react";

export default function QrCode({ value, size = 240 }: { value: string; size?: number }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <QRCodeSVG value={value} size={size} bgColor="#ffffff" fgColor="#0b0b12" level="M" />
    </div>
  );
}
