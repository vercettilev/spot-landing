import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchHoldings } from "./api";
import { forgetHoldings, primeHoldings } from "./holdings";
import { fateOf, snapshotOf, type Fate, type Pending } from "./trade";

/**
 * TRADES THE APP IS STILL WAITING ON, watched from outside any screen:
 * leaving the coin, switching tabs, even closing the app does not stop the
 * wallet being read until the trade shows up or can no longer land. Kept
 * on the phone too, so a restart does not forget a trade that may still
 * land, and offer it again.
 */

const KEY = "spot:pending";
const pending = new Map<string, Pending>();
const watching = new Set<string>();
const claimed = new Set<string>();

/** Hears every hold (fate null) and every verdict. */
type Listener = (p: Pending, fate: Fate | null) => void;
const listeners = new Set<Listener>();

const keyOf = (owner: string, mint: string) => `${owner} ${mint}`;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify([...pending.values()])).catch(() => {});
}

function emit(p: Pending, fate: Fate | null) {
  for (const fn of listeners) fn(p, fate);
}

export const pendingFor = (owner: string | null | undefined, mint: string): Pending | null => (owner ? (pending.get(keyOf(owner, mint)) ?? null) : null);

/** Hold a coin until the trade's fate is known. */
export function hold(p: Pending): void {
  const k = keyOf(p.owner, p.mint);
  pending.set(k, p);
  persist();
  emit(p, null);
  void watch(k);
}

/** Let a coin go without a verdict (a wallet disconnected, say). */
export function release(owner: string, mint: string): void {
  if (!pending.delete(keyOf(owner, mint))) return;
  persist();
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** A coin screen that is showing says its own coin's verdict, so it is not said twice. */
export function claim(owner: string, mint: string): () => void {
  const k = keyOf(owner, mint);
  claimed.add(k);
  return () => void claimed.delete(k);
}

export const isClaimed = (owner: string, mint: string): boolean => claimed.has(keyOf(owner, mint));

/* The wallet is read every few seconds until the trade shows in it or can
   no longer land. One watcher a coin; a hold placed while it runs is seen
   on the next read. */
async function watch(k: string): Promise<void> {
  if (watching.has(k)) return;
  watching.add(k);
  try {
    for (;;) {
      const p = pending.get(k);
      if (!p) return;
      const res = await fetchHoldings(p.owner);
      if (pending.get(k) !== p) continue;
      if (res.ok) primeHoldings(p.owner, res.value);
      const fate = fateOf(p, res.ok ? snapshotOf(res.value, p.mint) : null, Date.now());
      if (fate) {
        pending.delete(k);
        persist();
        if (!res.ok) forgetHoldings(p.owner);
        emit(p, fate);
        return;
      }
      await sleep(p.landed ? 2_000 : 3_000);
    }
  } finally {
    watching.delete(k);
  }
}

/** The trades held when the app last closed, watched again from here. */
export async function restore(): Promise<void> {
  let saved: unknown = [];
  try {
    saved = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]");
  } catch {
    /* nothing held */
  }
  for (const p of Array.isArray(saved) ? (saved as Pending[]) : []) {
    if (!p || typeof p.owner !== "string" || typeof p.mint !== "string" || typeof p.until !== "number" || !p.token) continue;
    const k = keyOf(p.owner, p.mint);
    if (pending.has(k)) continue;
    pending.set(k, p);
    emit(p, null);
    void watch(k);
  }
}
