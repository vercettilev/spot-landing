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
 * WHO RUNS SPOT. A privacy notice has to name who collects the addresses, so
 * this is the legal operator, not a brand: the person or company behind Spot,
 * set as NEXT_PUBLIC_OPERATOR on the deployment, so no name lives in the
 * code. Until it is set the pages leave the name out and say "we", as they
 * do the contact email. Spot is not run by Poppin Social, Inc.; the engine
 * in src/core came from Poppin's hackathon, which is history, not ownership.
 */
export const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR?.trim() || "";

/**
 * Where people write about their data or with questions, on /privacy and
 * /terms: Spot's own mailbox. NEXT_PUBLIC_CONTACT_EMAIL overrides it.
 */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "lev@spot.fun";

/**
 * Spot on X: the header and the pass link to it, a post shared from the pass
 * ends "via @handle", and social cards credit it. It was @getspotfun until
 * the account was renamed; that handle is free now, so nothing may point at it.
 */
export const X_HANDLE = "usespotdotfun";
export const X_URL = `https://x.com/${X_HANDLE}`;

export const TAGLINE = "Ape from any app.";
export const DESCRIPTION =
  "From your feed to your bag in four taps, with every coin sniffed for rugs first. No SOL, no gas. Coming soon to Android, iPhone and Solana Seeker.";
