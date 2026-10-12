import { NO_STORE, fail, getIp, json, makeRateLimiter, preflight } from "@/engine/api";
import { getDeps } from "@/engine/deps";
import { isRecord } from "@/engine/http";
import { TEXT_CAP, resolve } from "@/engine/resolve";

export const runtime = "nodejs";
export const maxDuration = 15;

const limit = makeRateLimiter(30);

/**
 * WHAT DID THEY SHARE? The share sheet's payload in, the coin out:
 * `{ url?, text? }`, as the app received them.
 *
 *   200 { ok, status: "found" | "ambiguous" | "none", pick, candidates, source, missed }
 *   400 nothing_shared | url_too_long | bad_json
 *   429 rate_limited
 *   503 lookup_failed: Jupiter did not answer, so "none" would be a guess
 */
async function answer(req: Request, url: unknown, text: unknown, cache: string): Promise<Response> {
  if (!limit(getIp(req))) return fail(429, "rate_limited");
  const u = typeof url === "string" ? url.trim() : "";
  const t = typeof text === "string" ? text : "";
  if (!u && !t.trim()) return fail(400, "nothing_shared");
  if (u.length > 2_048) return fail(400, "url_too_long");

  /* Share sheets put plain text in the URL slot often enough: a url that
     is not a web link is read as more of what was shared. */
  const isLink = /^https?:\/\//i.test(u);
  const shared = (isLink ? t : [u, t].filter(Boolean).join("\n")).slice(0, TEXT_CAP);
  const result = await resolve({ url: isLink ? u : undefined, text: shared }, getDeps());

  if (result.status === "none" && result.missed.includes("search")) {
    return fail(503, "lookup_failed", { missed: result.missed });
  }
  /* An answer built on everything it asked for keeps for a minute; one
     that missed an upstream is not worth remembering. */
  return json({ ok: true, ...result }, { cache: result.missed.length ? NO_STORE : cache });
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  return answer(req, q.get("url"), q.get("text") ?? q.get("q"), "public, s-maxage=60, stale-while-revalidate=300");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_json");
  }
  const b = isRecord(body) ? body : {};
  return answer(req, b.url, b.text, NO_STORE);
}

export const OPTIONS = preflight;
