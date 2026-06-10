export const SCREENSHOT_BUCKET = "screenshots";

/** Public URL for a file in the screenshots bucket. */
export function screenshotUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${SCREENSHOT_BUCKET}/${path}`;
}
