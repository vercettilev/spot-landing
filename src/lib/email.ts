import { Resend } from "resend";

/**
 * MAIL TO OURSELVES, never to the person who signed up. Two uses: a notice
 * when someone new joins, and a rescue when the store cannot take an address,
 * so the address survives in an inbox instead of vanishing with the request.
 *
 * Optional until configured: without RESEND_API_KEY, MAIL_FROM (an address on
 * a domain verified in Resend) and OPS_INBOX it does nothing and says so with
 * `false`. Never throws: a failed notification must not become a second
 * failure on top of the one it reports.
 */
async function mailOps(subject: string, lines: string[]): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const to = process.env.OPS_INBOX;
  if (!apiKey || !from || !to) return false;
  try {
    const res = await new Resend(apiKey).emails.send({ from, to, replyTo: to, subject, text: lines.join("\n") });
    if (res.error) {
      console.error(`Ops mail "${subject}" rejected:`, res.error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Ops mail "${subject}" threw:`, err instanceof Error ? err.message : err);
    return false;
  }
}

export function sendSignupNotice(email: string, platform: string): Promise<boolean> {
  return mailOps(`New Spot signup: ${email} (${platform})`, [
    `Someone asked for early access to Spot.`,
    ``,
    `email:    ${email}`,
    `platform: ${platform}`,
    `when:     ${new Date().toISOString()}`,
  ]);
}

export function sendRescue(
  email: string,
  platform: string,
  reason: string,
  line: { code?: string; referredBy?: string } = {},
): Promise<boolean> {
  return mailOps(`Spot waitlist rescue: ${email}`, [
    `An early-access signup could not be written to the store.`,
    ``,
    `email:    ${email}`,
    `platform: ${platform}`,
    `when:     ${new Date().toISOString()}`,
    ...(line.code ? [`code:     ${line.code}`] : []),
    ...(line.referredBy ? [`referred: ${line.referredBy}`] : []),
    `reason:   ${reason}`,
    ``,
    `This address is NOT in the store. Add it by hand once the store is back,`,
    `or it stays only in this message.`,
  ]);
}
