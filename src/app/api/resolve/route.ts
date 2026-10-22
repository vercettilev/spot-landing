import { NO_STORE, fail, getIp, inLines, json, makeRateLimiter, preflight } from "@/engine/api";
import { getDeps } from "@/engine/deps";
import { isRecord } from "@/engine/http";
import { fillIcons } from "@/engine/icons";
import { remembering } from "@/engine/jupiter";
import { TEXT_CAP, resolve } from "@/engine/resolve";
import { sniff, sniffSize } from "@/engine/sniff";
import { tally } from "@/engine/tally";

export const runtime = "nodejs";
/* A resolve, and the sniff of what it found. */
export const maxDuration = 30;

const limit = makeRateLimiter(30);

/**
 * WHAT DID THEY SHARE? The share sheet's payload in, the coin out:
 * `{ url?, text?, sniff? }`, as the app received them.
 *
 *   200 { ok, status: "found" | "ambiguous" | "none", pick, candidates, source, missed }
 *   400 nothing_shared | url_too_long | bad_json
 *   429 rate_limited
 *   503 lookup_failed: Jupiter did not answer, so "none" would be a guess
 *
 * A POST with `sniff: <usdc>` has a found coin sniffed in the same request,
 * sized to that, and the answer comes in two lines (NDJSON): the one above
 * at once, then `{ sniff }` when the verdict is in, the sniff as /api/sniff
 * answers it (null when it got none; the app asks /api/sniff then). The
 * coin shows while it is sniffed, and the sniff reads the coin the resolve
 * already found: the verdict comes a Jupiter search and a round trip sooner
 * than from /api/sniff after.
 */
async function answer(req: Request, url: unknown, text: unknown, cache: string, sniffUsdc: number | null): Promise<Response> {
  if (!limit(getIp(req))) return fail(429, "rate_limited");
  const u = typeof url === "string" ? url.trim() : "";
  const t = typeof text === "string" ? text : "";
  if (!u && !t.trim()) return fail(400, "nothing_shared");
  if (u.length > 2_048) return fail(400, "url_too_long");

  /* Share sheets put plain text in the URL slot often enough: a url that
     is not a web link is read as more of what was shared. */
  const isLink = /^https?:\/\//i.test(u);
  const shared = (isLink ? t : [u, t].filter(Boolean).join("\n")).slice(0, TEXT_CAP);
  const deps = getDeps();
  const search = remembering(deps.search);
  const result = await resolve({ url: isLink ? u : undefined, text: shared }, { ...deps, search });
  await Promise.all([fillIcons([...(result.pick ? [result.pick.token] : []), ...result.candidates.map((c) => c.token)], deps.readImage), tally("resolve", result.status)]);

  if (result.status === "none" && result.missed.includes("search")) {
    return fail(503, "lookup_failed", { missed: result.missed });
  }
  const mint = result.status === "found" ? result.pick?.token.mint : undefined;
  if (mint && sniffUsdc !== null) {
    return inLines({ ok: true, ...result }, async () => {
      const res = await deps.shareSniff(mint, sniffUsdc, () => sniff(mint, sniffUsdc, { ...deps, search }));
      if (!res.ok) return { sniff: null };
      await Promise.all([fillIcons([res.value.token], deps.readImage), tally("sniff", res.value.level)]);
      return { sniff: { ok: true, ...res.value } };
    });
  }
  /* An answer built on everything it asked for keeps for a minute; one
     that missed an upstream is not worth remembering. */
  return json({ ok: true, ...result }, { cache: result.missed.length ? NO_STORE : cache });
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  return answer(req, q.get("url"), q.get("text") ?? q.get("q"), "public, s-maxage=60, stale-while-revalidate=300", null);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_json");
  }
  const b = isRecord(body) ? body : {};
  return answer(req, b.url, b.text, NO_STORE, typeof b.sniff === "number" ? sniffSize(b.sniff) : null);
}

export const OPTIONS = preflight;
