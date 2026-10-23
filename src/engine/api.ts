/**
 * What every route answers with: JSON, open to any origin (the app is not a
 * browser and the coming web sniff page is), and a cache line that says how
 * long the answer stays true.
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  /* authorization: the app's Jupiter session for its 2x orders (/api/tp). */
  "access-control-allow-headers": "content-type, authorization",
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

/**
 * An answer in lines (NDJSON), each sent the moment it is known: the first
 * at once, the next when it comes. A next line that fails to come is left
 * out, and the first stands on its own.
 */
export function inLines(first: unknown, next: () => Promise<unknown>): Response {
  const line = (v: unknown) => new TextEncoder().encode(`${JSON.stringify(v)}\n`);
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(line(first));
      try {
        controller.enqueue(line(await next()));
      } catch {
        /* Nothing more to say. */
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      /* A proxy that compressed the answer could hold the first line back until the last. */
      "cache-control": `${NO_STORE}, no-transform`,
      ...CORS,
    },
  });
}

export const preflight = () => new Response(null, { status: 204, headers: CORS });

/* The caller's IP and the per-instance limiter are the waitlist's own: one
   rule for who is calling, wherever on the site they call. */
export { getIp, makeRateLimiter } from "@/lib/waitlist";
