import type { Kv } from "./line";

/**
 * Redis, as far as the line uses it, in memory. For tests: the same answers
 * Redis gives (sorted sets order by score, then by member), and a clock the
 * test can move to expire keys.
 */
export function memoryKv(): Kv & { advance(seconds: number): void } {
  const strings = new Map<string, string>();
  const zsets = new Map<string, Map<string, number>>();
  const sets = new Map<string, Set<string>>();
  const expiresAt = new Map<string, number>();
  let now = 0;

  const alive = (key: string) => {
    const at = expiresAt.get(key);
    if (at !== undefined && at <= now) {
      strings.delete(key);
      expiresAt.delete(key);
    }
  };
  const zset = (key: string) => zsets.get(key) ?? zsets.set(key, new Map()).get(key)!;
  const ordered = (key: string) =>
    [...zset(key).entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  return {
    async get(key) {
      alive(key);
      return strings.get(key) ?? null;
    },
    async setNx(key, value) {
      alive(key);
      if (strings.has(key)) return false;
      strings.set(key, value);
      return true;
    },
    async del(key) {
      strings.delete(key);
      zsets.delete(key);
      sets.delete(key);
      expiresAt.delete(key);
    },
    async incr(key) {
      alive(key);
      const n = Number(strings.get(key) ?? 0) + 1;
      strings.set(key, String(n));
      return n;
    },
    async expire(key, seconds) {
      expiresAt.set(key, now + seconds);
    },
    async zaddNx(key, score, member) {
      if (!zset(key).has(member)) zset(key).set(member, score);
    },
    async zscore(key, member) {
      return zset(key).get(member) ?? null;
    },
    async zincrby(key, by, member) {
      zset(key).set(member, (zset(key).get(member) ?? 0) + by);
    },
    async zrank(key, member) {
      const i = ordered(key).findIndex(([m]) => m === member);
      return i === -1 ? null : i;
    },
    async zrange(key) {
      return ordered(key).map(([m]) => m);
    },
    async sadd(key, member) {
      const s = sets.get(key) ?? sets.set(key, new Set()).get(key)!;
      if (s.has(member)) return false;
      s.add(member);
      return true;
    },
    async scard(key) {
      return sets.get(key)?.size ?? 0;
    },
    advance(seconds) {
      now += seconds;
    },
  };
}
