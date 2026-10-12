import { useShareIntent } from "expo-share-intent";
import { useEffect, useRef } from "react";
import { fromShare } from "./logic";
import type { Share } from "./types";

/**
 * Share → Spot. Each share that arrives (a link from X, a TikTok, a
 * forwarded Telegram message) is handed over once and then cleared, so
 * coming back to the app later does not replay it.
 */
export function useIncomingShare(onShare: (share: Share) => void): void {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({ resetOnBackground: true });
  const latest = useRef(onShare);
  latest.current = onShare;

  /* Keyed on the share itself: resetShareIntent is a new function every
     render, and depending on it would hand the same share over twice. */
  useEffect(() => {
    if (!hasShareIntent) return;
    const share = fromShare(shareIntent);
    resetShareIntent();
    if (share) latest.current(share);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, shareIntent]);
}
