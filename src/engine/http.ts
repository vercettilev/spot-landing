/**
 * The one way this API talks to anything else: a request with a deadline
 * that never throws. Every upstream (Jupiter, the RPC, X, TikTok, YouTube,
 * Telegram, Dexscreener, a shortener) answers through this, so "it was slow"
 * and "it said no" stay different facts all the way up.
 */

export type Fetch = typeof fetch;

export type Failure = "timeout" | "network_error" | "http_error" | "rate_limited" | "bad_shape";

export type Outcome<T, F extends string = Failure> = { ok: true; value: T } | { ok: false; reason: F };

export interface Fetched {
  status: number;
  headers: Headers;
  text: string;
}

/* Never stored bare: a host fetch called as a property of another object
   throws "Illegal invocation" in some runtimes (spot-core learned this in
   production; see core/route/jupiter.ts). */
export const bindFetch = (f: Fetch): Fetch => (...args) => f(...args);

export async function fetchText(
  fetchFn: Fetch,
  url: string,
  init: RequestInit & { timeoutMs: number },
): Promise<Outcome<Fetched, "timeout" | "network_error">> {
  const { timeoutMs, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { ...rest, signal: controller.signal });
    const text = await res.text();
    return { ok: true, value: { status: res.status, headers: res.headers, text } };
  } catch (err) {
    const aborted = (err as Error)?.name === "AbortError";
    return { ok: false, reason: aborted ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

/** JSON, or undefined for anything that is not. */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export const num = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
};

/**
 * A small memory for one instance: the same post shared by a hundred people
 * in the same minute is read once. Oldest entries go first when it is full.
 */
export function ttlCache<V>(ttlMs: number, max = 500) {
  const entries = new Map<string, { at: number; value: V }>();
  return {
    get(key: string, now = Date.now()): V | undefined {
      const hit = entries.get(key);
      if (!hit) return undefined;
      if (now - hit.at > ttlMs) {
        entries.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key: string, value: V, now = Date.now()): void {
      if (entries.size >= max) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      entries.set(key, { at: now, value });
    },
  };
}
