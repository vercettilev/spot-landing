import { randomBytes, timingSafeEqual } from "node:crypto";
import { lineOrder, personFor, type Kv } from "./line";
import { SITE_URL } from "./site";
import type { SignupRecord } from "./store";
import { parsePlatform, type Platform } from "./waitlist";

/**
 * THE INVITES: when Spot is ready for a phone, the people waiting for it get
 * one email each, in the order the line put them, and never a second.
 *
 * Who is invited is kept in Redis next to the line, by the person (the hash
 * of their address, as the line keeps them), so a record that came before the
 * line had codes is still one person:
 *
 *   spot:invited          set of people sent an invite
 *   spot:unsubscribed     set of people who asked for no more email
 *   spot:unsubtok:<p>     the secret in a person's unsubscribe link
 */
const INVITED = "spot:invited";
const UNSUBSCRIBED = "spot:unsubscribed";
const tokenKey = (person: string) => `spot:unsubtok:${person}`;

/** The most one press sends. Resend's batch call takes 100. */
export const MAX_PER_SEND = 100;

/**
 * WHERE AN INVITE SENDS EACH PHONE, from the environment, so the link can move
 * (a test build today, the dApp Store at launch) without a release. A phone
 * with no link is not invited yet. Seeker takes Android's link unless it has
 * its own: it is an Android phone with the dApp Store built in.
 */
export function inviteLinks(env: Record<string, string | undefined> = process.env): Partial<Record<Platform, string>> {
  const https = (v: string | undefined) => (v && /^https:\/\/\S+$/.test(v.trim()) ? v.trim() : undefined);
  const android = https(env.INVITE_URL_ANDROID);
  return { android, seeker: https(env.INVITE_URL_SEEKER) ?? android, iphone: https(env.INVITE_URL_IPHONE) };
}

export type Invitee = {
  person: string;
  email: string;
  platform: Platform;
  /** Their place in line, or null for a record from before the line. */
  place: number | null;
};

export type Count = { onList: number; invited: number; unsubscribed: number; waiting: number; noLink: number };

export type Plan = {
  /** The next people to invite, front of the line first. */
  next: Invitee[];
  /** Per phone, and "unknown" for those who never named one. */
  byPhone: Record<string, Count>;
};

/**
 * WHO IS NEXT. Pure, so it is tested without a network: the line's order
 * (its codes, front first), then anyone the line does not know in arrival
 * order; skipping who was invited, who unsubscribed, and whoever's phone has
 * no link yet.
 */
export function planInvites(
  records: SignupRecord[],
  order: string[],
  state: { invited: Set<string>; unsubscribed: Set<string> },
  links: Partial<Record<Platform, string>>,
  count: number,
): Plan {
  const place = new Map(order.map((code, i) => [code, i + 1]));
  const rank = (r: SignupRecord) => (r.code && place.get(r.code)) || Number.MAX_SAFE_INTEGER;
  const rows = [...records].sort((a, b) => rank(a) - rank(b) || a.created_at.localeCompare(b.created_at));

  const byPhone: Record<string, Count> = {};
  const next: Invitee[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const person = personFor(r.email);
    if (seen.has(person)) continue; // the same inbox typed twice is one person
    seen.add(person);
    const platform = parsePlatform(r.platform);
    const phone = platform ?? "unknown";
    const c = (byPhone[phone] ??= { onList: 0, invited: 0, unsubscribed: 0, waiting: 0, noLink: 0 });
    c.onList++;
    if (state.unsubscribed.has(person)) c.unsubscribed++;
    else if (state.invited.has(person)) c.invited++;
    else if (!platform || !links[platform]) c.noLink++;
    else {
      c.waiting++;
      if (next.length < count) next.push({ person, email: r.email, platform, place: r.code ? (place.get(r.code) ?? null) : null });
    }
  }
  return { next, byPhone };
}

/** The list's invite state, two reads however long the list. */
export async function inviteState(kv: Kv): Promise<{ invited: Set<string>; unsubscribed: Set<string>; order: string[] }> {
  const [invited, unsubscribed, order] = await Promise.all([kv.smembers(INVITED), kv.smembers(UNSUBSCRIBED), lineOrder(kv)]);
  return { invited: new Set(invited), unsubscribed: new Set(unsubscribed), order };
}

/**
 * CLAIM A PERSON BEFORE MAILING THEM. Adding to the set says whether this
 * request was first, so two presses at once never mail one person twice. A
 * send that fails gives the claim back, so they are in the next press.
 */
export const claim = (kv: Kv, person: string) => kv.sadd(INVITED, person);
export const release = (kv: Kv, person: string) => kv.srem(INVITED, person);

/** A person's unsubscribe secret, made the first time it is needed. */
export async function unsubscribeToken(kv: Kv, person: string): Promise<string> {
  await kv.setNx(tokenKey(person), randomBytes(16).toString("hex"));
  return (await kv.get(tokenKey(person))) as string;
}

/**
 * A person's two ways out: the page their email's footer opens, which asks
 * first, and the address a mail app posts to for one-click unsubscribe.
 */
export function unsubscribeLinks(person: string, token: string, site = SITE_URL): { page: string; oneClick: string } {
  const q = `p=${person}&t=${token}`;
  return { page: `${site}/unsubscribe?${q}`, oneClick: `${site}/api/unsubscribe?${q}` };
}

const sameSecret = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Takes a person off every future email, if the link's secret is theirs. */
export async function unsubscribe(kv: Kv, person: string, token: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(person) || !/^[0-9a-f]{32}$/.test(token)) return false;
  const expected = await kv.get(tokenKey(person));
  if (!expected || !sameSecret(expected, token)) return false;
  await kv.sadd(UNSUBSCRIBED, person);
  return true;
}

/** An address as the owner's page shows it: enough to recognise, not to copy. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  const local = email.slice(0, at);
  return `${local.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, local.length - 2)))}${email.slice(at)}`;
}
