import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";
import { cleanEmail, getIp, looksLikeEmail, makeRateLimiter, parsePlatform } from "@/lib/waitlist";
import { recordSignup, UNKNOWN_PLATFORM } from "@/lib/store";
import { sendRescue, sendSignupNotice } from "@/lib/email";
import { credit, getKv, join, nextPlace, personFor, spotOf } from "@/lib/line";
import { parseCode, type Spot } from "@/lib/referral";

export const runtime = "nodejs";

const rateLimit = makeRateLimiter(5);
const lookupLimit = makeRateLimiter(30);

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * JOIN THE EARLY-ACCESS LIST: an address, the phone when the page knows it,
 * and the code of the link that brought them, if one did.
 *
 * THREE LAYERS, CHEAPEST FIRST. BotID answers automated traffic (this path is
 * declared in instrumentation-client.ts; without that entry checkBotId() has
 * no challenge headers to read and refuses everyone), the honeypot answers
 * whatever fills every field, and the limiter bounds one instance.
 */
export async function POST(req: Request) {
  const verification = await checkBotId();
  if (verification.isBot) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!rateLimit(getIp(req))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { email?: unknown; platform?: unknown; website?: unknown; ref?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  /* THE HONEYPOT, a field the form keeps off-screen. A filled one gets the
     same success shape a person gets: a bot told it failed adjusts, a bot told
     it succeeded leaves. */
  if (typeof body?.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ success: true });
  }

  if (!looksLikeEmail(body?.email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  /* THE PHONE IS OPTIONAL. The page reads it from the device when it can and
     asks after joining when it cannot (a desktop), so a signup may come
     without one. A value that is not one of the three is still refused. */
  const named = body?.platform !== undefined && body?.platform !== null && body?.platform !== "";
  const platform = named ? parsePlatform(body.platform) : null;
  if (named && !platform) {
    return NextResponse.json({ error: "invalid_platform" }, { status: 400 });
  }
  const email = cleanEmail(body.email);
  const ref = parseCode(body?.ref);

  /* THE LINE FIRST, so the record can carry the code it hands out. The line
     is a bonus on top of the list: without Redis, or with Redis down, the
     address is still kept and the reader just sees no place. */
  const kv = getKv();
  const person = personFor(email);
  let line: { code: string; isNew: boolean } | null = null;
  if (kv) {
    try {
      line = await join(kv, person);
    } catch (err) {
      console.error("Waitlist line failed:", message(err));
    }
  }
  const referredBy = line?.isNew && ref ? ref : undefined;

  const result = await recordSignup(email, platform, { code: line?.code, referredBy });

  /* THE STORE IS ALLOWED TO FAIL; LOSING THE ADDRESS IS NOT. A store that
     cannot answer falls through to mail, and only a failure of both turns the
     reader away. */
  if (!result.stored) {
    console.error("Waitlist store failed:", result.reason);
    if (!(await sendRescue(email, platform ?? UNKNOWN_PLATFORM, result.reason, { code: line?.code, referredBy }))) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  } else if (result.isNew) {
    /* Only for someone new; pressing the button twice is not news. Best-effort:
       the address is already stored. */
    await sendSignupNotice(email, platform ?? UNKNOWN_PLATFORM);
  }

  /* The friend's credit waits until the address is kept, so a signup that
     failed never moves anyone. */
  let spot: Spot | null = null;
  if (kv && line) {
    try {
      if (referredBy) await credit(kv, { ref: referredBy, newcomer: person, ip: getIp(req) });
      spot = await spotOf(kv, line.code);
    } catch (err) {
      console.error("Waitlist line failed:", message(err));
    }
  }

  const already = result.stored ? !result.isNew : line ? !line.isNew : false;
  return NextResponse.json({ success: true, already_registered: already, spot });
}

/**
 * WHERE A CODE STANDS NOW, for a reader coming back to see whether their
 * friends moved them. A code is all it takes and all it reveals: a place and
 * a count, no address.
 *
 * ?next instead answers the number a newcomer would get, for the line under
 * the form. It is the same for every reader, so the CDN holds it for half a
 * minute and the database hears about it a couple of times a minute at most.
 */
export async function GET(req: Request) {
  if (!lookupLimit(getIp(req))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const params = new URL(req.url).searchParams;
  const kv = getKv();
  const noStore = { "cache-control": "no-store" };
  if (params.has("next")) {
    if (!kv) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: noStore });
    try {
      const next = await nextPlace(kv);
      return NextResponse.json(
        { success: true, next },
        { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } },
      );
    } catch (err) {
      console.error("Waitlist line failed:", message(err));
      return NextResponse.json({ error: "unavailable" }, { status: 503, headers: noStore });
    }
  }
  const code = parseCode(params.get("code"));
  if (!code) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }
  if (!kv) {
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: noStore });
  }
  try {
    const spot = await spotOf(kv, code);
    if (!spot) return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
    return NextResponse.json({ success: true, spot }, { headers: noStore });
  } catch (err) {
    console.error("Waitlist line failed:", message(err));
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers: noStore });
  }
}
