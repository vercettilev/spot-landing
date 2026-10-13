import { createHash } from "node:crypto";
import { getKv, type Kv } from "@/lib/line";

/**
 * HOW MUCH SPOT IS USED, and nothing about by whom: one number a day for
 * each thing that happened (a post resolved, a coin sniffed and what it
 * got, an order built, a trade landed, a bag read) and how many different
 * wallets were seen, as one-way hashes. Ninety days, then gone. Without a
 * Redis database connected, nothing is counted and nothing breaks.
 *
 *   spot:tally:<day>:<event>          count
 *   spot:tally:<day>:<event>:<kind>   count (a verdict, a side, a status)
 *   spot:tally:<day>:wallets          set of hashes
 */

export type Event = "resolve" | "sniff" | "order" | "landed" | "bag";

export const KINDS: Record<Event, string[]> = {
  resolve: ["found", "ambiguous", "none"],
  sniff: ["ok", "warn", "block", "unknown"],
  order: ["buy", "sell", "cash"],
  landed: [],
  bag: [],
};

const KEEP = 90 * 24 * 60 * 60;

export const day = (now = Date.now()): string => new Date(now).toISOString().slice(0, 10);

const key = (d: string, ...parts: string[]) => ["spot:tally", d, ...parts].join(":");

/** One more of an event today, with its kind when it has one. Never throws; a slow database costs nothing. */
export async function tally(event: Event, kind?: string, kv: Kv | null = getKv(), now = Date.now()): Promise<void> {
  if (!kv) return;
  const d = day(now);
  const keys = [key(d, event), ...(kind ? [key(d, event, kind)] : [])];
  try {
    await Promise.all(
      keys.map(async (k) => {
        if ((await kv.incr(k)) === 1) await kv.expire(k, KEEP);
      }),
    );
  } catch {
    /* counting is never worth an error */
  }
}

/** One more wallet seen today: how many, never which. */
export async function tallyWallet(owner: string, kv: Kv | null = getKv(), now = Date.now()): Promise<void> {
  if (!kv) return;
  const k = key(day(now), "wallets");
  try {
    if (await kv.sadd(k, createHash("sha256").update(owner).digest("base64url").slice(0, 16))) await kv.expire(k, KEEP);
  } catch {
    /* as above */
  }
}

export interface DayTally {
  day: string;
  resolve: Record<string, number>;
  sniff: Record<string, number>;
  order: Record<string, number>;
  landed: number;
  bag: number;
  wallets: number;
}

/** The last `days` days, today first. */
export async function tallies(days: number, kv: Kv, now = Date.now()): Promise<DayTally[]> {
  const n = async (k: string) => Number(await kv.get(k)) || 0;
  const counts = async (d: string, event: Event) =>
    Object.fromEntries(await Promise.all(["all", ...KINDS[event]].map(async (kind) => [kind, await n(kind === "all" ? key(d, event) : key(d, event, kind))])));
  return Promise.all(
    Array.from({ length: days }, (_, i) => day(now - i * 86_400_000)).map(async (d) => ({
      day: d,
      resolve: await counts(d, "resolve"),
      sniff: await counts(d, "sniff"),
      order: await counts(d, "order"),
      landed: await n(key(d, "landed")),
      bag: await n(key(d, "bag")),
      wallets: await kv.scard(key(d, "wallets")),
    })),
  );
}
