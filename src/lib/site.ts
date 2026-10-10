/**
 * THE SITE'S OWN FACTS, in one place.
 *
 * SITE_URL is the public address once the domain is picked. Until it is set,
 * canonical links, the sitemap and social cards point at localhost, which is
 * harmless on a preview and wrong in production: set NEXT_PUBLIC_SITE_URL.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

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
  "Saw a stock or a coin on TikTok, Reddit or X? Buy it on the spot: share the post, tap Spot, confirm. Coming soon to iPhone, Android and Solana Seeker.";
