import type { ImageReader } from "./chain";
import type { TokenCard } from "./token";

/**
 * Cards Jupiter had no image for get the chain's, read once a mint and a
 * few at a time; whatever the chain has none for keeps its letter.
 */
export async function fillIcons(cards: TokenCard[], readImage: ImageReader, max = 12): Promise<void> {
  const byMint = new Map<string, TokenCard[]>();
  for (const c of cards) if (c.icon === null) byMint.set(c.mint, [...(byMint.get(c.mint) ?? []), c]);
  const mints = [...byMint.keys()].slice(0, max);
  if (!mints.length) return;
  const images = await Promise.all(mints.map((m) => readImage(m).catch(() => null)));
  mints.forEach((m, i) => {
    const image = images[i];
    if (image) for (const c of byMint.get(m)!) c.icon = image;
  });
}
