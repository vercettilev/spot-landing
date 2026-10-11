import { createHash, randomInt } from "node:crypto";
import { Redis } from "@upstash/redis";
import { CODE_ALPHABET, CODE_LENGTH, REF_BONUS, parseCode, type Spot } from "./referral";

/**
 * THE LINE: who stands ahead of whom on the early-access list, and the
 * referral links that move people up it. It lives in Redis because a place in
 * line needs what a file store cannot give: a counter two people cannot both
 * take the same number from, and a sorted set that answers "how many are
 * ahead of me" without reading everyone.
 *
 * It holds no addresses. A person is the hash of their address, so the line
 * can tell a repeat from a newcomer and nothing more; the addresses stay in
 * the Blob store (store.ts), which is the list of record.
 *
 * Keys:
 *   spot:seq          counter, one number per newcomer, in order of arrival
 *   spot:line         sorted set of codes; score = arrival, less the referral bonus
 *   spot:id:<hash>    the code a person was given
 *   spot:code:<code>  the person a code belongs to
 *   spot:refs:<code>  the people who joined through that code
 *   spot:ipref:<ip>   referral credits a network gave today (expires)
 */

/** The few Redis commands the line uses, so tests can run it against a fake. */
export interface Kv {
  get(key: string): Promise<string | null>;
  setNx(key: string, value: string): Promise<boolean>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  zaddNx(key: string, score: number, member: string): Promise<void>;
  zscore(key: string, member: string): Promise<number | null>;
  zincrby(key: string, by: number, member: string): Promise<void>;
  zrank(key: string, member: string): Promise<number | null>;
  zrange(key: string): Promise<string[]>;
  sadd(key: string, member: string): Promise<boolean>;
  scard(key: string): Promise<number>;
}

const SEQ = "spot:seq";
const LINE = "spot:line";
const idKey = (id: string) => `spot:id:${id}`;
const codeKey = (code: string) => `spot:code:${code}`;
const refsKey = (code: string) => `spot:refs:${code}`;
const ipKey = (ip: string) => `spot:ipref:${createHash("sha256").update(`spot-ref-ip:${ip}`).digest("hex").slice(0, 32)}`;

/* A network can give this many referral credits a day. One person with ten
   addresses at home earns five; a dorm full of real friends rarely needs
   more. The counter forgets the network after a day. */
const IP_CREDITS_PER_DAY = 5;

/* PLACE = ARRIVAL, LESS THE BONUS. The arrival number carries a tiny fraction
   of itself, so equal scores still break toward whoever came first. A credit
   subtracts half a spot more than it promises: landing exactly on someone's
   score would tie, and the tie goes to them, so a friend would move you up
   one spot short of the number the page shows. */
const arrival = (seq: number) => seq + seq / 1e8;
const STEP = REF_BONUS + 0.5;

/**
 * THE SAME PERSON, HOWEVER THEY TYPE IT. Gmail ignores dots and everything
 * after a plus, and most providers ignore the plus part, so `j.doe+x@gmail.com`
 * and `jdoe@gmail.com` reach one inbox and get one place. Without this, one
 * inbox could sign up a dozen times and refer itself up the line.
 */
export function canonicalEmail(email: string): string {
  const at = email.lastIndexOf("@");
  let local = email.slice(0, at).trim().toLowerCase();
  let domain = email.slice(at + 1).trim().toLowerCase();
  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replaceAll(".", "") || local;
  return `${local}@${domain}`;
}

export function personFor(email: string): string {
  return createHash("sha256").update(canonicalEmail(email)).digest("hex");
}

function mintCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/* A code that is in the books but missing from the line (a request that died
   between the two writes) gets a place at the back now, rather than never. */
async function ensureInLine(kv: Kv, code: string): Promise<void> {
  if ((await kv.zscore(LINE, code)) !== null) return;
  await kv.zaddNx(LINE, arrival(await kv.incr(SEQ)), code);
}

/**
 * JOIN, OR FIND ONE'S PLACE AGAIN. A newcomer gets a fresh code and the next
 * number; someone already in line gets their own code back. The person key is
 * claimed with SET NX, so two requests for the same address at the same
 * moment end with one code, not two places.
 */
export async function join(kv: Kv, person: string): Promise<{ code: string; isNew: boolean }> {
  const known = await kv.get(idKey(person));
  if (known) {
    await ensureInLine(kv, known);
    return { code: known, isNew: false };
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = mintCode();
    if (!(await kv.setNx(codeKey(code), person))) continue; // taken by someone else; draw again
    if (!(await kv.setNx(idKey(person), code))) {
      // The same address got here first in another request: give the code back, use theirs.
      await kv.del(codeKey(code));
      const theirs = (await kv.get(idKey(person))) as string;
      await ensureInLine(kv, theirs);
      return { code: theirs, isNew: false };
    }
    await kv.zaddNx(LINE, arrival(await kv.incr(SEQ)), code);
    return { code, isNew: true };
  }
  throw new Error("Could not mint a free referral code in 5 tries");
}

/**
 * A FRIEND JOINED THROUGH `ref`: move its owner up. Only for someone new to
 * the line (the caller checks), never for the owner themselves, at most once
 * per newcomer, and only within the network's daily allowance. Says whether
 * the credit was given.
 */
export async function credit(kv: Kv, { ref, newcomer, ip }: { ref: string; newcomer: string; ip: string }): Promise<boolean> {
  const code = parseCode(ref);
  if (!code) return false;
  const owner = await kv.get(codeKey(code));
  if (!owner || owner === newcomer) return false;

  const key = ipKey(ip);
  const given = await kv.incr(key);
  if (given === 1) await kv.expire(key, 24 * 60 * 60);
  if (given > IP_CREDITS_PER_DAY) return false;

  if (!(await kv.sadd(refsKey(code), newcomer))) return false;
  await kv.zincrby(LINE, -STEP, code);
  return true;
}

/** Where a code stands now, or null for a code the line does not know. */
export async function spotOf(kv: Kv, code: string): Promise<Spot | null> {
  const [rank, referrals] = await Promise.all([kv.zrank(LINE, code), kv.scard(refsKey(code))]);
  if (rank === null) return null;
  return { code, rank: rank + 1, referrals };
}

/** The number a newcomer would get now: one past everyone in line. */
export async function nextPlace(kv: Kv): Promise<number> {
  return (Number(await kv.get(SEQ)) || 0) + 1;
}

/** Every code, front of the line first. For the export script. */
export function lineOrder(kv: Kv): Promise<string[]> {
  return kv.zrange(LINE);
}

/**
 * The Upstash client behind the Kv interface. Values come back as the strings
 * Redis stored (automatic JSON parsing off), so a code made only of digits
 * cannot come back as a number.
 */
export function upstashKv(url: string, token: string): Kv {
  const r = new Redis({ url, token, automaticDeserialization: false });
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    get: async (k) => {
      const v = await r.get<string>(k);
      return v === null || v === undefined ? null : String(v);
    },
    setNx: async (k, v) => (await r.set(k, v, { nx: true })) === "OK",
    del: async (k) => {
      await r.del(k);
    },
    incr: (k) => r.incr(k),
    expire: async (k, s) => {
      await r.expire(k, s);
    },
    zaddNx: async (k, score, member) => {
      await r.zadd(k, { nx: true }, { score, member });
    },
    zscore: async (k, m) => num(await r.zscore(k, m)),
    zincrby: async (k, by, m) => {
      await r.zincrby(k, by, m);
    },
    zrank: async (k, m) => num(await r.zrank(k, m)),
    zrange: async (k) => (await r.zrange<string[]>(k, 0, -1)).map(String),
    sadd: async (k, m) => (await r.sadd(k, m)) === 1,
    scard: (k) => r.scard(k),
  };
}

let cached: Kv | null | undefined;

/**
 * The line, when a Redis database is connected: Vercel's Upstash integration
 * sets KV_REST_API_URL and KV_REST_API_TOKEN, Upstash's own names work too.
 * Without one the list still takes signups; it just has no places to show.
 */
export function getKv(): Kv | null {
  if (cached !== undefined) return cached;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  cached = url && token ? upstashKv(url, token) : null;
  return cached;
}
