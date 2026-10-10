/**
 * REFERRAL LINKS, THE PART BOTH SIDES SHARE: the page reads a code off a link
 * and shows the reader their place, the server checks the code and moves the
 * line. Nothing here touches the store, so the browser can import it.
 */

/** Spots one friend moves you up. The page promises this number; the line applies it. */
export const REF_BONUS = 10;

/* Seven characters from 31 that cannot be misread when someone types a link
   off a screenshot: no 0/O, no 1/I/L. About 27 billion codes. */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 7;
const CODE_RE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

export function parseCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  return CODE_RE.test(v) ? v : null;
}

/** Someone's place: 1 is the front of the line. */
export type Spot = { code: string; rank: number; referrals: number };

export function referralLink(siteUrl: string, code: string): string {
  return `${siteUrl}/r/${code}`;
}

/** The link as people read it: no scheme, no www. */
export function displayLink(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
}
