import type { Outcome } from "./http";
import type { Sniff, SniffError } from "./sniff";

export type SniffAnswer = Outcome<Sniff, SniffError>;
export type ShareSniff = (mint: string, usdc: number, run: () => Promise<SniffAnswer>) => Promise<SniffAnswer>;

/**
 * ONE SNIFF FOR A CROWD. A sniff just made is shared for ten seconds by
 * everyone this instance answers about the same coin at the same size, the
 * way the CDN shares /api/sniff's answers: a hot coin shared by many at
 * once costs one sniff's worth of Jupiter quotes, not one each, whether it
 * was asked for alone or came with a resolve (a POST, which no CDN keeps).
 * One still running is shared too; one that failed or could not finish is
 * not kept. A buy never reads from here: /api/order sniffs afresh.
 */
export function sniffSharing(keepMs = 10_000, now: () => number = Date.now, max = 500): ShareSniff {
  const recent = new Map<string, { at: number; answer: Promise<SniffAnswer> }>();
  return (mint, usdc, run) => {
    const key = `${mint}:${usdc}`;
    const t = now();
    const hit = recent.get(key);
    if (hit && t - hit.at < keepMs) return hit.answer;
    for (const [k, v] of recent) if (t - v.at >= keepMs) recent.delete(k);
    if (recent.size >= max) recent.delete(recent.keys().next().value!);
    const entry = { at: t, answer: run() };
    recent.set(key, entry);
    const drop = () => {
      if (recent.get(key) === entry) recent.delete(key);
    };
    entry.answer.then((a) => {
      if (!a.ok || a.value.level === "unknown") drop();
      /* The ten seconds run from the verdict, as the CDN's do. */ else entry.at = now();
    }, drop);
    return entry.answer;
  };
}
