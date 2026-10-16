import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
  claim,
  inviteLinks,
  inviteState,
  maskEmail,
  MAX_PER_SEND,
  planInvites,
  release,
  unsubscribeLinks,
  unsubscribeToken,
} from "@/lib/invite";
import { inviteMail } from "@/lib/inviteMail";
import { getKv } from "@/lib/line";
import { SITE_URL } from "@/lib/site";
import { allSignups } from "@/lib/store";
import { cleanEmail, getIp, looksLikeEmail, makeRateLimiter, parsePlatform } from "@/lib/waitlist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** A test goes to any address, so it is held to ten an hour, key or no key. */
const tests = makeRateLimiter(10, 60 * 60_000);

/**
 * THE OWNER'S KEY. Off (404) until SPOT_ADMIN_KEY is set, and only a long
 * one: this route mails the whole list. Compared in constant time.
 */
function keyCheck(req: Request): "off" | "wrong" | "ok" {
  const expected = process.env.SPOT_ADMIN_KEY?.trim();
  if (!expected || expected.length < 24) return "off";
  const given = req.headers.get("x-spot-key") ?? "";
  const ok = given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  return ok ? "ok" : "wrong";
}

function mailer(): { resend: Resend; from: string; replyTo?: string } | null {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return null;
  return { resend: new Resend(key), from, replyTo: process.env.MAIL_REPLY_TO || process.env.OPS_INBOX || undefined };
}

const fail = (status: number, error: string, message?: string) => NextResponse.json({ ok: false, error, message }, { status });

/**
 * THE LIST, AS THE INVITES SEE IT: per phone, how many are on it, invited,
 * unsubscribed, waiting with a link, and waiting for one; whether mail and
 * each phone's link are set; and the next 25 in line. Addresses go out
 * masked: the page is for counting and checking, not for copying the list.
 */
export async function GET(req: Request) {
  const key = keyCheck(req);
  if (key === "off") return fail(404, "not_found");
  if (key === "wrong") return fail(401, "no_key");
  const kv = getKv();
  if (!kv) return fail(503, "no_database");
  const [records, state] = await Promise.all([allSignups(), inviteState(kv)]);
  const links = inviteLinks();
  const plan = planInvites(records, state.order, state, links, 25);
  return NextResponse.json({
    ok: true,
    mail: Boolean(mailer()),
    postal: Boolean(process.env.MAIL_POSTAL_ADDRESS?.trim()),
    links: { android: Boolean(links.android), seeker: Boolean(links.seeker), iphone: Boolean(links.iphone) },
    byPhone: plan.byPhone,
    next: plan.next.map((i) => ({ place: i.place, email: maskEmail(i.email), platform: i.platform })),
  });
}

/**
 * TWO ACTIONS.
 *
 *   { action: "test", to, platform? }  the invite as one phone's people get
 *                                      it, to one address; marks no one.
 *   { action: "send", count }          the next `count` in line (at most
 *                                      100), one Resend batch, each person
 *                                      claimed first so a second press, or two
 *                                      at once, never mails them twice; a
 *                                      failed email gives its claim back.
 */
export async function POST(req: Request) {
  const key = keyCheck(req);
  if (key === "off") return fail(404, "not_found");
  if (key === "wrong") return fail(401, "no_key");
  const kv = getKv();
  if (!kv) return fail(503, "no_database");
  const mail = mailer();
  if (!mail) return fail(503, "no_mail", "Set RESEND_API_KEY and MAIL_FROM.");

  let body: { action?: unknown; to?: unknown; platform?: unknown; count?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request");
  }
  const links = inviteLinks();

  if (body.action === "test") {
    if (!tests(getIp(req))) return fail(429, "rate_limited");
    if (!looksLikeEmail(body.to)) return fail(400, "invalid_email");
    const platform = parsePlatform(body.platform) ?? "android";
    /* Without a link for the phone yet, the test still shows the email, with
       the site where the key will point. */
    const m = inviteMail({ platform, place: 1, link: links[platform] ?? SITE_URL, unsubscribe: unsubscribeLinks("test", "test") });
    const { data, error } = await mail.resend.emails.send({
      from: mail.from,
      to: cleanEmail(body.to),
      replyTo: mail.replyTo,
      subject: `[Test] ${m.subject}`,
      html: m.html,
      text: m.text,
      headers: m.headers,
    });
    if (error) return fail(502, "test_failed", error.message);
    return NextResponse.json({ ok: true, id: data?.id, linkSet: Boolean(links[platform]) });
  }

  if (body.action === "send") {
    const count = Math.floor(Number(body.count));
    if (!(count >= 1)) return fail(400, "bad_count");
    const [records, state] = await Promise.all([allSignups(), inviteState(kv)]);
    const plan = planInvites(records, state.order, state, links, Math.min(count, MAX_PER_SEND));

    const people: typeof plan.next = [];
    const emails = [];
    let answer;
    try {
      for (const person of plan.next) {
        if (!(await claim(kv, person.person))) continue; // another press got them first
        people.push(person);
        const m = inviteMail({
          platform: person.platform,
          place: person.place,
          link: links[person.platform]!,
          unsubscribe: unsubscribeLinks(person.person, await unsubscribeToken(kv, person.person)),
        });
        emails.push({ from: mail.from, to: person.email, replyTo: mail.replyTo, subject: m.subject, html: m.html, text: m.text, headers: m.headers });
      }
      if (!emails.length) return NextResponse.json({ ok: true, sent: 0, failed: 0, people: [] });
      answer = await mail.resend.batch.send(emails, { batchValidation: "permissive" });
    } catch (e) {
      answer = { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
    }

    /* Nothing went out: every claim goes back, so nobody stays marked invited
       who never got the email, the database failing halfway included. */
    const { data, error } = answer;
    if (error || !data) {
      await Promise.allSettled(people.map((p) => release(kv, p.person)));
      return fail(502, "send_failed", error?.message);
    }
    const failed = new Set((data.errors ?? []).map((e) => e.index));
    await Promise.allSettled(people.filter((_, i) => failed.has(i)).map((p) => release(kv, p.person)));
    return NextResponse.json({
      ok: true,
      sent: people.length - failed.size,
      failed: failed.size,
      people: people.map((p, i) => ({ place: p.place, email: maskEmail(p.email), platform: p.platform, sent: !failed.has(i) })),
    });
  }

  return fail(400, "bad_action");
}
