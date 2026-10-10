import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";
import { cleanEmail, getIp, looksLikeEmail, makeRateLimiter, parsePlatform } from "@/lib/waitlist";
import { recordSignup } from "@/lib/store";
import { sendRescue, sendSignupNotice } from "@/lib/email";

export const runtime = "nodejs";

const rateLimit = makeRateLimiter(5);

/**
 * JOIN THE EARLY-ACCESS LIST: an address and a phone.
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

  let body: { email?: unknown; platform?: unknown; website?: unknown };
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
  const platform = parsePlatform(body?.platform);
  if (!platform) {
    return NextResponse.json({ error: "invalid_platform" }, { status: 400 });
  }
  const email = cleanEmail(body.email);

  const result = await recordSignup(email, platform);

  /* THE STORE IS ALLOWED TO FAIL; LOSING THE ADDRESS IS NOT. A store that
     cannot answer falls through to mail, and only a failure of both turns the
     reader away. */
  if (!result.stored) {
    console.error("Waitlist store failed:", result.reason);
    if (!(await sendRescue(email, platform, result.reason))) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  /* Only for someone new; pressing the button twice is not news. Best-effort:
     the address is already stored. */
  if (result.isNew) await sendSignupNotice(email, platform);

  return NextResponse.json({ success: true, already_registered: !result.isNew });
}
