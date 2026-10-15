import { PUPPY_INNER, PUPPY_VIEWBOX } from "@/components/puppyArt";

/* THE PUPPY ON ITS OWN, without its tile, for where it stands on orange (the
   phone demo's buy moment, as in the app's Moment). Built from puppyArt.ts
   when the site is built, so the logo keeps one source, and served as a file
   so the page carries a link to it rather than 14 KB of paths twice over. */
export const dynamic = "force-static";

export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${PUPPY_VIEWBOX}">${PUPPY_INNER.replaceAll("__P__", "p")}</svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
}
