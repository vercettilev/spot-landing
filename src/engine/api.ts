/**
 * What every route answers with: JSON, open to any origin (the app is not a
 * browser and the coming web sniff page is), and a cache line that says how
 * long the answer stays true.
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

export const NO_STORE = "no-store";

export function json(body: unknown, init: { status?: number; cache?: string } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": init.cache ?? NO_STORE,
      ...CORS,
    },
  });
}

export const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  json({ ok: false, error, ...extra }, { status });

export const preflight = () => new Response(null, { status: 204, headers: CORS });

/* The caller's IP and the per-instance limiter are the waitlist's own: one
   rule for who is calling, wherever on the site they call. */
export { getIp, makeRateLimiter } from "@/lib/waitlist";
