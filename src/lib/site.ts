/**
 * THE SITE'S OWN FACTS, in one place.
 *
 * SITE_URL is the public address: canonical links, the sitemap, social cards
 * and the share link after signing up. It is www.usespot.fun because that is
 * the address that serves the site; usespot.fun answers with a redirect to it,
 * and links should land on the page, not on a redirect. Previews and local
 * runs use it too, which is what a share link should do.
 * NEXT_PUBLIC_SITE_URL overrides it, for a staging copy or a new domain.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.usespot.fun").replace(/\/+$/, "");

/**
 * WHO RUNS THIS SITE. A privacy notice has to name the company that collects
 * the addresses, so this is the legal operator, not a brand. If Spot moves to
 * its own company, this line changes with it.
 */
export const OPERATOR = "Poppin Social, Inc.";

/** Where people can write about their data. Required before launch; the privacy page omits the line until it is set. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "";

export const TAGLINE = "The buy button for every app.";
export const DESCRIPTION =
  "Saw a stock or a coin on TikTok, Reddit or X? Buy or sell it on the spot: share the post, tap Spot, confirm. Coming soon to iPhone, Android and Solana Seeker.";
