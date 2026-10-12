import { findAddresses, isAddress } from "./address";

export type Platform = "x" | "tiktok" | "youtube" | "telegram" | "reddit" | "instagram" | "web";

/** A post whose words Spot can read without anyone's login. */
export type PostRef =
  | { platform: "x"; id: string; canonical: string }
  | { platform: "tiktok"; canonical: string }
  | { platform: "youtube"; id: string; canonical: string }
  | { platform: "telegram"; channel: string; canonical: string };

export interface SharedLink {
  /** The link as given, or as its shortener said it goes. */
  url: string;
  platform: Platform;
  /** Addresses written in the link itself, case intact. */
  addresses: string[];
  /**
   * Dexscreener writes addresses lowercased in its URLs, and base58 is case
   * sensitive, so these are not addresses until Dexscreener says which one
   * they were.
   */
  loose: string[];
  post: PostRef | null;
  /** A shortener: what it points at is only known after one redirect. */
  short: boolean;
}

/* Hosts whose links are read without a scheme too, because that is how
   people paste them ("pump.fun/coin/…" in a Telegram message). */
const BARE = /\b(?:dexscreener\.com|pump\.fun|birdeye\.so|gmgn\.ai|photon-sol\.tinyastro\.io|axiom\.trade|solscan\.io|jup\.ag|t\.me)\/[^\s<>"'`]+/gi;
const FULL = /\bhttps?:\/\/[^\s<>"'`]+/gi;
const TRAILING = /[)\].,!?:;'"}>…]+$/;

/** The links in a piece of shared text, in order, each once. */
export function findUrls(text: string): string[] {
  const out: string[] = [];
  const add = (raw: string) => {
    const clean = raw.replace(TRAILING, "");
    if (clean && !out.includes(clean)) out.push(clean);
  };
  for (const m of text.matchAll(FULL)) add(m[0]);
  /* A bare link that is the tail of a full one is not a second link. */
  const rest = text.replace(FULL, " ");
  for (const m of rest.matchAll(BARE)) add(`https://${m[0]}`);
  return out;
}

const hostOf = (u: URL) => u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");

const X_HOSTS = new Set(["x.com", "twitter.com", "fxtwitter.com", "vxtwitter.com", "fixupx.com", "fixvx.com"]);

/**
 * Shorteners Spot will ask "where does this go?" They are asked one
 * question each and never followed: the answer is read as a link, and the
 * page it names is fetched only if it is itself on this list or one of the
 * post readers.
 */
const SHORT_HOSTS = new Set(["t.co", "vm.tiktok.com", "vt.tiktok.com", "bit.ly"]);

export const isShortener = (u: URL) =>
  SHORT_HOSTS.has(hostOf(u)) || (hostOf(u) === "tiktok.com" && u.pathname.startsWith("/t/"));

function decoded(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function postOf(u: URL, host: string): PostRef | null {
  const path = u.pathname;
  if (X_HOSTS.has(host)) {
    const m = /^\/(?:([A-Za-z0-9_]{1,15})|i(?:\/web)?)\/status(?:es)?\/(\d{5,25})/.exec(path);
    if (!m) return null;
    const id = m[2]!;
    return { platform: "x", id, canonical: `https://x.com/${m[1] ?? "i"}/status/${id}` };
  }
  if (host === "tiktok.com") {
    const m = /^\/(@[A-Za-z0-9._]{1,40})\/(video|photo)\/(\d{5,25})/.exec(path);
    if (!m) return null;
    return { platform: "tiktok", canonical: `https://www.tiktok.com/${m[1]}/${m[2]}/${m[3]}` };
  }
  if (host === "youtube.com" || host === "youtu.be") {
    const id =
      host === "youtu.be"
        ? /^\/([A-Za-z0-9_-]{11})/.exec(path)?.[1]
        : (u.searchParams.get("v") ?? /^\/(?:shorts|live|embed)\/([A-Za-z0-9_-]{11})/.exec(path)?.[1]);
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return { platform: "youtube", id, canonical: `https://www.youtube.com/watch?v=${id}` };
  }
  if (host === "t.me" || host === "telegram.me") {
    const m = /^\/(?:s\/)?([A-Za-z][A-Za-z0-9_]{3,31})\/(\d{1,12})\/?$/.exec(path);
    if (!m) return null;
    return { platform: "telegram", channel: m[1]!, canonical: `https://t.me/${m[1]}/${m[2]}` };
  }
  return null;
}

function platformOf(host: string): Platform {
  if (X_HOSTS.has(host) || host === "t.co") return "x";
  if (host.endsWith("tiktok.com")) return "tiktok";
  if (host === "youtube.com" || host === "youtu.be") return "youtube";
  if (host === "t.me" || host === "telegram.me") return "telegram";
  if (host === "reddit.com" || host === "redd.it" || host.endsWith(".reddit.com")) return "reddit";
  if (host === "instagram.com") return "instagram";
  return "web";
}

/** What a link says before anyone is asked anything. Null if it is not a web link. */
export function readLink(raw: string): SharedLink | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = hostOf(u);

  const loose: string[] = [];
  let addresses: string[];
  if (host === "dexscreener.com") {
    const seg = /^\/solana\/([^/?#]+)/i.exec(u.pathname)?.[1] ?? "";
    /* All lowercase means lowercased: a real address of this length has
       capitals in it all but always, and a lowercased one can still decode
       to 32 bytes by chance. */
    addresses = /[A-Z]/.test(seg) && isAddress(seg) ? [seg] : [];
    if (!addresses.length && /^[1-9a-z]{32,44}$/.test(seg)) loose.push(seg);
  } else {
    /* The path and the query, decoded: launchpads put the mint in the path
       (pump.fun/coin/…), terminals in the query (?address=…), bots in a
       start parameter (?start=ref_…_<mint>). */
    addresses = findAddresses(decoded(`${u.pathname} ${u.search}`));
  }

  return {
    url: u.toString(),
    platform: platformOf(host),
    addresses,
    loose,
    post: postOf(u, host),
    short: isShortener(u),
  };
}
