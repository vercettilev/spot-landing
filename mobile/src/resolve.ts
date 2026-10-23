import { fetch } from "expo/fetch";
import { API_BASE, type Answer } from "./api";
import { firstThen } from "./lines";
import { DEFAULT_AMOUNT } from "./logic";
import type { ResolveResult, Share, Sniff } from "./types";

/**
 * WHAT DID THEY SHARE? → one coin, "which one?", or none. One coin comes
 * with its sniff on the same answer, a little after it: the coin shows
 * while it is sniffed, and the verdict skips a search and a round trip
 * (see /api/resolve). The coin's screen takes that sniff from here instead
 * of asking /api/sniff, and asks only when none came.
 *
 * expo/fetch, because React Native's own fetch hands over a body only once
 * all of it is in; and apart from api.ts, because its native module does
 * not load in the Node tests.
 */

const FIRST_MS = 15_000;
const SNIFF_MS = 20_000;
/* A sniff waits this long for its coin's screen, then it is too old to show. */
const KEEP_MS = 60_000;

const coming = new Map<string, { at: number; sniff: Promise<Sniff | null> }>();

export async function resolveShare(share: Share): Promise<Answer<ResolveResult>> {
  const controller = new AbortController();
  let late = false;
  const clock = (ms: number) =>
    setTimeout(() => {
      late = true;
      controller.abort();
    }, ms);
  let timer = clock(FIRST_MS);
  try {
    const res = await fetch(`${API_BASE}/api/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: share.url, text: share.text, sniff: DEFAULT_AMOUNT }),
      signal: controller.signal,
    });
    const { answer, then } = await firstThen<ResolveResult>(res as unknown as Response);
    clearTimeout(timer);
    const mint = answer.ok && answer.value.status === "found" ? answer.value.pick?.token.mint : undefined;
    if (mint) {
      timer = clock(SNIFF_MS);
      const sniff = then.then((line) => sniffOf(line?.sniff, mint)).finally(() => clearTimeout(timer));
      coming.set(mint, { at: Date.now(), sniff });
    }
    return answer;
  } catch {
    clearTimeout(timer);
    return { ok: false, error: late ? "timeout" : "offline" };
  }
}

function sniffOf(v: unknown, mint: string): Sniff | null {
  const s = v as Partial<Sniff> | null | undefined;
  return s && typeof s === "object" && s.mint === mint && typeof s.level === "string" && Array.isArray(s.checks) ? (s as Sniff) : null;
}

/** The sniff on its way with this coin, if one is; null when the coin's screen should ask for one. */
export function sniffComing(mint: string, now = Date.now()): Promise<Sniff | null> | null {
  const c = coming.get(mint);
  if (c && now - c.at > KEEP_MS) coming.delete(mint);
  return c && now - c.at <= KEEP_MS ? c.sniff : null;
}

/** Taken: the next sniff of this coin is a fresh one. */
export function sniffTaken(mint: string, sniff: Promise<Sniff | null>): void {
  if (coming.get(mint)?.sniff === sniff) coming.delete(mint);
}
