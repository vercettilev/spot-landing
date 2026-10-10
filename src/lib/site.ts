/**
 * THE SITE'S OWN FACTS, in one place.
 *
 * SITE_URL is the public address: canonical links, the sitemap, social cards
 * and the share link after signing up. NEXT_PUBLIC_SITE_URL wins when set. On
 * Vercel it otherwise falls back to the project's production domain (the
 * shortest custom domain, else the .vercel.app one), so the first deploy
 * already shares the right link; previews share it too, which is what a
 * share link should do. Only a local run is left on localhost.
 */
const VERCEL_PRODUCTION = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (VERCEL_PRODUCTION ? `https://${VERCEL_PRODUCTION}` : "http://localhost:3000")
).replace(/\/+$/, "");

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
