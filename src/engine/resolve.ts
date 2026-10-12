import { curatedByTicker } from "@/core/catalog/index";
import { extractCandidates } from "@/core/context/extract";
import { resolveTickerFrom, type UltraSearchClient } from "@/core/resolve/ultra";
import { findAddresses } from "./address";
import type { PairLookup } from "./dexscreener";
import type { Outcome } from "./http";
import { ultraAuthority, type TokenInfo } from "./jupiter";
import { findUrls, readLink, type Platform, type PostRef, type SharedLink } from "./links";
import type { Post, PostFailure } from "./posts";
import { cardOf, issuedAsset, type TokenCard } from "./token";

/**
 * WHAT DID THEY SHARE? A link, a post, a screenshot's words, a CA pasted
 * from a group chat: whatever came through the share sheet, turned into the
 * coin it is about.
 *
 * An explicit share is the intent, so unlike spot-core's page reader this
 * never answers "probably nothing". It answers with one coin when the share
 * names one, asks "which one?" when it names several or a cashtag several
 * coins share, and says "none" only when nothing in it is a coin.
 *
 * Strongest claim first: an address in the shared link itself (the page IS
 * that coin), then addresses in the post and in links inside it, then pools
 * that trade a coin, then cashtags, then names of issued assets.
 */

export type Via = "link" | "post" | "text" | "pair" | "cashtag" | "name";

export interface Candidate {
  token: TokenCard;
  via: Via;
}

export interface ResolveResult {
  /** found: open the coin. ambiguous: ask which. none: nothing to buy here. */
  status: "found" | "ambiguous" | "none";
  pick: Candidate | null;
  /** Ranked. With "found", the pick first and the next-best after it. */
  candidates: Candidate[];
  source: { platform: Platform | "text"; url: string | null; author: string | null; text: string | null };
  /** Upstreams that did not answer, so an empty result can say why. */
  missed: string[];
}

export interface ResolveDeps {
  search: UltraSearchClient;
  readPost: (ref: PostRef) => Promise<Outcome<Post, PostFailure>>;
  expand: (url: string) => Promise<string | null>;
  pairs: PairLookup;
}

export interface ResolveInput {
  url?: string | undefined;
  text?: string | undefined;
}

export const TEXT_CAP = 5_000;
const MAX_LINKS = 3;
const MAX_POST_LINKS = 3;
const MAX_ADDRESSES = 5;
const MAX_CHOICES = 3;
const MAX_TICKERS = 2;

const ORGANIC: Record<string, number> = { high: 3, medium: 2, low: 1 };

/** Who a coin is among its namesakes: verified, organic, deep, held. */
function byStanding(a: TokenInfo, b: TokenInfo): number {
  return (
    Number(b.isVerified === true) - Number(a.isVerified === true) ||
    (ORGANIC[b.organicScoreLabel ?? ""] ?? 0) - (ORGANIC[a.organicScoreLabel ?? ""] ?? 0) ||
    (b.liquidity ?? 0) - (a.liquidity ?? 0) ||
    (b.holderCount ?? 0) - (a.holderCount ?? 0)
  );
}

/**
 * A namesake Spot could never buy is not a rival reading of a cashtag: a
 * live freeze key is a block (sniff.ts), so it does not get to make a
 * clear cashtag ambiguous. Issued assets keep their keys on purpose.
 */
const buyable = (t: TokenInfo) => ultraAuthority(t, "freeze") === "revoked" || issuedAsset(t.id) !== undefined;

const bare = (symbol: string | undefined) => (symbol ?? "").replace(/^\$/, "").trim().toLowerCase();

export async function resolve(input: ResolveInput, deps: ResolveDeps): Promise<ResolveResult> {
  const missed = new Set<string>();
  const shared = (input.text ?? "").slice(0, TEXT_CAP);

  async function open(raw: string): Promise<SharedLink | null> {
    const link = readLink(raw);
    if (!link?.short) return link;
    const target = await deps.expand(link.url);
    if (!target) {
      missed.add("short_link");
      return link;
    }
    return readLink(target) ?? link;
  }

  async function lookup(mints: string[]): Promise<Map<string, TokenInfo>> {
    const found = new Map<string, TokenInfo>();
    if (!mints.length) return found;
    const res = await deps.search.search(mints.join(","));
    if (!res.ok) {
      missed.add("search");
      return found;
    }
    for (const t of res.value) if (mints.includes(t.id)) found.set(t.id, t);
    return found;
  }

  /* 1. The links, each short one asked where it goes. */
  const raws = [...new Set([...(input.url ? [input.url] : []), ...findUrls(shared)])].slice(0, MAX_LINKS);
  const links = (await Promise.all(raws.map(open))).filter((l): l is SharedLink => l !== null);

  /* 2. The words of the first post that has readable words. */
  const ref = links.find((l) => l.post)?.post ?? null;
  let post: Post | null = null;
  if (ref) {
    const got = await deps.readPost(ref);
    if (got.ok) post = got.value;
    else missed.add("post");
  }
  const postLinks = post
    ? (await Promise.all(post.links.slice(0, MAX_POST_LINKS).map(open))).filter((l): l is SharedLink => l !== null)
    : [];

  /* 3. Every address, strongest claim first, each once. */
  const named: { address: string; via: Via; first: boolean }[] = [];
  const note = (address: string, via: Via, first = false) => {
    if (!named.some((n) => n.address === address)) named.push({ address, via, first });
  };
  links.forEach((l, i) => l.addresses.forEach((a) => note(a, "link", i === 0)));
  postLinks.forEach((l) => l.addresses.forEach((a) => note(a, "post")));
  findAddresses(post?.text ?? "").forEach((a) => note(a, "post"));
  findAddresses(shared).forEach((a) => note(a, "text"));
  const asked = named.slice(0, MAX_ADDRESSES);
  const loose = [...links, ...postLinks].flatMap((l) => l.loose).slice(0, MAX_ADDRESSES);

  const picked: { mint: string; via: Via; first: boolean }[] = [];
  if (asked.length || loose.length) {
    const direct = await lookup(asked.map((n) => n.address));
    const rest = asked.filter((n) => !direct.has(n.address));
    let pools = new Map<string, string>();
    if (rest.length || loose.length) {
      const res = await deps.pairs(rest.map((n) => n.address), loose);
      if (res.ok) pools = res.value;
      else missed.add("pairs");
    }
    for (const n of asked) {
      if (direct.has(n.address)) picked.push({ mint: n.address, via: n.via, first: n.first });
      else if (pools.has(n.address)) picked.push({ mint: pools.get(n.address)!, via: "pair", first: n.first });
    }
    for (const l of loose) {
      const mint = pools.get(l);
      if (mint) picked.push({ mint, via: "pair", first: links[0]?.loose.includes(l) ?? false });
    }

    const missing = [...new Set(picked.map((p) => p.mint))].filter((m) => !direct.has(m));
    const more = await lookup(missing);
    const infos = new Map([...direct, ...more]);
    const candidates: Candidate[] = [];
    const firsts = new Set<string>();
    for (const p of picked) {
      const info = infos.get(p.mint);
      if (!info) continue;
      if (p.first) firsts.add(p.mint);
      if (!candidates.some((c) => c.token.mint === p.mint)) candidates.push({ token: cardOf(info), via: p.via });
    }

    if (candidates.length) {
      /* One coin in the shared link itself settles it, whatever else the
         post mentions; so does one coin in the whole share. */
      const sole = firsts.size === 1 ? [...firsts][0] : candidates.length === 1 ? candidates[0]!.token.mint : null;
      if (sole) {
        const pick = candidates.find((c) => c.token.mint === sole)!;
        return done("found", pick, [pick, ...candidates.filter((c) => c !== pick)]);
      }
      return done("ambiguous", null, candidates);
    }
  }

  /* 4. Cashtags: the post's own first, then the rest of what was shared.
     The first that names a coin decides; a second rides along as another
     choice. */
  const { tickers, entities } = extractCandidates({
    text: shared,
    ...(post?.text ? { headline: post.text } : {}),
    ...(links[0] ? { url: links[0].url } : {}),
  });
  const tags = await Promise.all(tickers.slice(0, MAX_TICKERS).map((t) => cashtag(t.symbol)));
  const lead = tags.find((t) => t.choices.length);
  if (lead) {
    const also = tags
      .filter((t) => t !== lead)
      .map((t) => t.winner ?? t.choices[0])
      .filter((c): c is Candidate => c !== undefined && !lead.choices.some((x) => x.token.mint === c.token.mint));
    return lead.winner
      ? done("found", lead.winner, [...lead.choices, ...also])
      : done("ambiguous", null, [...lead.choices, ...also]);
  }

  /* 5. A tokenized stock named in words ("Nvidia"), from spot-core's closed
     list of names. Never picked on its own: it is a guess, so it is asked. */
  if (entities.length) {
    const infos = await lookup(entities.slice(0, MAX_CHOICES).map((e) => e.mint));
    const cards = entities
      .map((e) => infos.get(e.mint))
      .filter((x): x is TokenInfo => x !== undefined)
      .map((x): Candidate => ({ token: cardOf(x), via: "name" }));
    if (cards.length) return done("ambiguous", null, cards);
  }

  return done("none", null, []);

  /**
   * One cashtag: the catalog's mint if it has one (spot-core asks the
   * catalog before Jupiter, because Ultra's answer for a stock ticker is a
   * crowd of impostors), else Jupiter's namesakes that could be bought,
   * best first. A winner only when spot-core's tiebreaks name one.
   */
  async function cashtag(symbol: string): Promise<{ winner: Candidate | null; choices: Candidate[] }> {
    const curated = curatedByTicker(symbol);
    if (curated) {
      const info = (await lookup([curated.mint])).get(curated.mint);
      const c: Candidate | null = info ? { token: cardOf(info), via: "cashtag" } : null;
      return { winner: c, choices: c ? [c] : [] };
    }
    const res = await deps.search.search(symbol);
    if (!res.ok) {
      missed.add("search");
      return { winner: null, choices: [] };
    }
    const namesakes = res.value.filter((x) => bare(x.symbol) === symbol.toLowerCase() && buyable(x)).sort(byStanding);
    const best = resolveTickerFrom(symbol, namesakes);
    const ranked = best ? [best, ...namesakes.filter((x) => x !== best)] : namesakes;
    const choices = ranked.slice(0, MAX_CHOICES).map((x): Candidate => ({ token: cardOf(x), via: "cashtag" }));
    return { winner: best ? choices[0]! : null, choices };
  }

  function done(status: ResolveResult["status"], pick: Candidate | null, candidates: Candidate[]): ResolveResult {
    const text = (post?.text ?? shared).trim();
    return {
      status,
      pick,
      candidates,
      source: {
        platform: links[0]?.platform ?? "text",
        url: links[0]?.url ?? null,
        author: post?.author ?? null,
        text: text ? text.slice(0, 280) : null,
      },
      missed: [...missed],
    };
  }
}
