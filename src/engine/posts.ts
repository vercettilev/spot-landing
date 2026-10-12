import { bindFetch, fetchText, isRecord, parseJson, str, ttlCache, type Fetch, type Outcome } from "./http";
import { isShortener, type Platform, type PostRef } from "./links";

/**
 * THE WORDS OF A SHARED POST, read the way an embed reads them: public
 * oEmbed endpoints (X, TikTok, YouTube) and Telegram's public widget. No
 * keys, no logins, and nothing a logged-out visitor could not see. A
 * private, deleted or age-gated post simply has no words.
 */

export interface Post {
  platform: Platform;
  text: string;
  /** "@handle" where the platform gives one, a display name where not. */
  author: string | null;
  /** Links written in the post. X hands these back as t.co. */
  links: string[];
}

export type PostFailure = "unavailable" | "timeout" | "network_error";

const POST_TIMEOUT_MS = 2_500;
const SHORT_TIMEOUT_MS = 1_500;
const MAX_HOPS = 3;

/* Honest about what it is; t.co answers a crawler with a plain redirect. */
const UA = "Mozilla/5.0 (compatible; SpotBot/1.0; +https://usespot.fun)";

const ENTITIES: Record<string, string> = {
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};

function fromCodePoint(n: number): string {
  try {
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d: string) => fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/&amp;/g, "&"); // last, so "&amp;lt;" stays "&lt;"
}

/** Visible text of an HTML fragment: line breaks kept, tags dropped. */
export function textOf(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*/g, "\n")
    .trim();
}

export function hrefsOf(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
    const href = decodeEntities(m[1]!);
    if (/^https?:\/\//i.test(href) && !out.includes(href)) out.push(href);
  }
  return out;
}

/**
 * X's oEmbed html is `<blockquote><p>POST</p>&mdash; Name (@handle) <a>date</a>
 * </blockquote>`. Only the first <p> is the post (the rest is X's own byline,
 * the same reading oddie-hook's market cards use). Its links are t.co;
 * cashtag and mention links point back at X and say nothing new.
 */
export function readXEmbed(html: string): { text: string; links: string[] } {
  const p = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(html)?.[1] ?? "";
  const links = hrefsOf(p).filter((h) => !/^https?:\/\/(www\.)?(twitter|x)\.com\//i.test(h));
  return { text: textOf(p), links };
}

/** Telegram's widget page: the message is the one `tgme_widget_message_text` block. */
export function readTelegramWidget(html: string): { text: string; links: string[] } | null {
  const m = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
  if (!m) return null;
  return { text: textOf(m[1]!), links: hrefsOf(m[1]!) };
}

const handleFromUrl = (url: string | undefined): string | null => {
  const m = url ? /^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]{1,15})\/?$/i.exec(url) : null;
  return m ? `@${m[1]}` : null;
};

export interface PostReaderOptions {
  fetchFn?: Fetch;
}

export function makePostReader(opts: PostReaderOptions = {}) {
  const fetchFn = bindFetch(opts.fetchFn ?? fetch);
  const memo = ttlCache<Post>(5 * 60_000);

  async function getJson(url: string): Promise<Outcome<Record<string, unknown>, PostFailure>> {
    const res = await fetchText(fetchFn, url, {
      timeoutMs: POST_TIMEOUT_MS,
      headers: { accept: "application/json", "user-agent": UA },
    });
    if (!res.ok) return res;
    const body = res.value.status === 200 ? parseJson(res.value.text) : undefined;
    return isRecord(body) ? { ok: true, value: body } : { ok: false, reason: "unavailable" };
  }

  async function read(ref: PostRef): Promise<Outcome<Post, PostFailure>> {
    if (ref.platform === "x") {
      const res = await getJson(
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(ref.canonical)}&omit_script=1&dnt=true`,
      );
      if (!res.ok) return res;
      const { text, links } = readXEmbed(str(res.value.html) ?? "");
      if (!text && !links.length) return { ok: false, reason: "unavailable" };
      return {
        ok: true,
        value: {
          platform: "x",
          text,
          links,
          author: handleFromUrl(str(res.value.author_url)) ?? str(res.value.author_name) ?? null,
        },
      };
    }
    if (ref.platform === "tiktok" || ref.platform === "youtube") {
      const url =
        ref.platform === "tiktok"
          ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(ref.canonical)}`
          : `https://www.youtube.com/oembed?url=${encodeURIComponent(ref.canonical)}&format=json`;
      const res = await getJson(url);
      if (!res.ok) return res;
      const text = (str(res.value.title) ?? "").trim();
      if (!text) return { ok: false, reason: "unavailable" };
      const handle = str(res.value.author_unique_id);
      return {
        ok: true,
        value: {
          platform: ref.platform,
          text,
          links: [],
          author: handle ? `@${handle}` : (str(res.value.author_name) ?? null),
        },
      };
    }
    const res = await fetchText(fetchFn, `${ref.canonical}?embed=1&mode=tme`, {
      timeoutMs: POST_TIMEOUT_MS,
      headers: { "user-agent": UA },
    });
    if (!res.ok) return res;
    const widget = res.value.status === 200 ? readTelegramWidget(res.value.text) : null;
    if (!widget || (!widget.text && !widget.links.length)) return { ok: false, reason: "unavailable" };
    return { ok: true, value: { platform: "telegram", ...widget, author: `@${ref.channel}` } };
  }

  return async function readPost(ref: PostRef): Promise<Outcome<Post, PostFailure>> {
    const hit = memo.get(ref.canonical);
    if (hit) return { ok: true, value: hit };
    const out = await read(ref);
    if (out.ok) memo.set(ref.canonical, out.value);
    return out;
  };
}

/**
 * WHERE A SHORT LINK GOES, asked of the shortener and never followed. Each
 * hop's answer is only read as a link; a hop is made only to a host on the
 * shortener list, so a shared link can never make this server fetch an
 * arbitrary page. Null when the shortener would not say.
 */
export function makeExpander(opts: PostReaderOptions = {}) {
  const fetchFn = bindFetch(opts.fetchFn ?? fetch);
  const memo = ttlCache<string>(60 * 60_000);

  return async function expand(start: string): Promise<string | null> {
    const hit = memo.get(start);
    if (hit) return hit;
    let url = start;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      let u: URL;
      try {
        u = new URL(url);
      } catch {
        return null;
      }
      if (!isShortener(u)) break;
      const res = await fetchText(fetchFn, url, {
        timeoutMs: SHORT_TIMEOUT_MS,
        redirect: "manual",
        headers: { "user-agent": UA },
      });
      if (!res.ok) return null;
      const { status, headers, text } = res.value;
      const next =
        status >= 300 && status < 400
          ? headers.get("location")
          : /http-equiv="refresh"[^>]*content="\d+;\s*url=([^"]+)"/i.exec(text)?.[1] ??
            /<title>(https?:\/\/[^<]+)<\/title>/i.exec(text)?.[1];
      if (!next) return null;
      try {
        url = new URL(decodeEntities(next), url).toString();
      } catch {
        return null;
      }
    }
    if (url === start) return null;
    memo.set(start, url);
    return url;
  };
}
