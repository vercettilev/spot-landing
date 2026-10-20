import { OPERATOR, SITE_URL, X_HANDLE, X_URL } from "./site";
import { PLATFORM_LABEL, type Platform } from "./waitlist";

/** The phone as the invite names it: Seeker by its short name on the key. */
const KEY_NAME: Record<Platform, string> = { iphone: "iPhone", android: "Android", seeker: "Seeker" };

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type InviteMail = { subject: string; html: string; text: string; headers: Record<string, string> };

/**
 * THE INVITE, one email per person: you're in, your place, the one key that
 * gets the app for your phone, how Spot works in a line, and who holds the
 * money. Plain light paper and the orange key, so it reads the same in every
 * inbox, dark mode included; the puppy is the PNG icon, since mail clients do
 * not show SVG. The words are the page's: four taps, sniffed for rugs, your
 * wallet approves every trade.
 *
 * Every invite carries its unsubscribe link in the footer and in the
 * List-Unsubscribe headers, so a mail app can offer one-click unsubscribe
 * (RFC 8058) and the address stops getting anything from us.
 */
export function inviteMail({
  platform,
  place,
  link,
  unsubscribe,
  postalAddress = process.env.MAIL_POSTAL_ADDRESS?.trim() || "",
}: {
  platform: Platform;
  place: number | null;
  link: string;
  unsubscribe: { page: string; oneClick: string };
  postalAddress?: string;
}): InviteMail {
  const phone = PLATFORM_LABEL[platform];
  const subject = `You're in: Spot is ready for ${phone}`;
  const lead = `Spot is ready for ${phone}.${place ? ` You were #${place} in line, and this is your invite.` : " This is your invite."}`;
  const key = `Get Spot for ${KEY_NAME[platform]}`;
  const how =
    "On a post on X, TikTok, Telegram or YouTube, or a coin's page, tap Share, then Spot (on X, it's under Share\u00a0via…). Spot sniffs the coin for rugs first. If nothing smells off, you ape in four taps.";
  const money = "Your wallet keeps your coins and approves every trade. Spot never holds them.";
  const why = "You're getting this because you joined the early-access list at usespot.fun.";
  const from = [OPERATOR, postalAddress].filter(Boolean).join(", ");

  const font = "Arial, Helvetica, sans-serif";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f5f0;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Share a post to Spot, ape in four taps.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f5f0;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border-radius:20px;">
<tr><td style="padding:32px 32px 0;">
<img src="${SITE_URL}/icon-192.png" width="56" height="56" alt="Spot" style="display:block;border:0;border-radius:14px;">
</td></tr>
<tr><td style="padding:20px 32px 0;font-family:${font};">
<h1 style="margin:0;font-size:34px;line-height:38px;font-weight:900;letter-spacing:-1px;color:#0b0b0c;">You're in.</h1>
<p style="margin:14px 0 0;font-size:17px;line-height:26px;color:#3a3a40;">${escape(lead)}</p>
</td></tr>
<tr><td style="padding:26px 32px 0;">
<a href="${escape(link)}" style="display:inline-block;padding:15px 28px;border-radius:14px;background:#fc4e02;color:#0b0b0c;font-family:${font};font-weight:800;font-size:17px;text-decoration:none;">${escape(key)}</a>
</td></tr>
<tr><td style="padding:26px 32px 0;font-family:${font};font-size:15px;line-height:23px;color:#3a3a40;">
<p style="margin:0;"><b style="color:#0b0b0c;">How it works.</b> ${escape(how)}</p>
<p style="margin:12px 0 0;">${escape(money)}</p>
</td></tr>
<tr><td style="padding:26px 32px 32px;font-family:${font};font-size:15px;line-height:23px;color:#0b0b0c;">
Spot &middot; <a href="${X_URL}" style="color:#d94200;text-decoration:none;">@${X_HANDLE}</a>
</td></tr>
</table>
<p style="max-width:480px;margin:18px auto 0;font-family:${font};font-size:12px;line-height:18px;color:#6a6760;">${escape(why)} <a href="${escape(unsubscribe.page)}" style="color:#6a6760;">Unsubscribe</a><br>${escape(from)}</p>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    "You're in.",
    "",
    lead,
    "",
    `${key}: ${link}`,
    "",
    `How it works. ${how}`,
    "",
    money,
    "",
    `Spot · @${X_HANDLE} on X`,
    "",
    "--",
    why,
    `Unsubscribe: ${unsubscribe.page}`,
    from,
  ].join("\n");

  return {
    subject,
    html,
    text,
    headers: { "List-Unsubscribe": `<${unsubscribe.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  };
}
