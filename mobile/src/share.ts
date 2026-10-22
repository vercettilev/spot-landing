import { useShareIntent } from "expo-share-intent";
import { useEffect, useRef } from "react";
import { publishShareTarget, shareTargetUsed } from "../modules/share-target";
import { fromShare } from "./logic";
import { readScreenshot } from "./ocr";
import type { Share } from "./types";

/**
 * Share → Spot. Each share that arrives (a link from X, a TikTok, a
 * forwarded Telegram message, a screenshot) is handed over once and then
 * cleared, so coming back to the app later does not replay it. Each one
 * also moves Spot's shortcut up the share sheet's top row
 * (modules/share-target).
 */
export function useIncomingShare(onShare: (share: Share) => void): void {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({ resetOnBackground: true });
  const latest = useRef(onShare);
  latest.current = onShare;

  useEffect(() => publishShareTarget(), []);

  /* Keyed on the share itself: resetShareIntent is a new function every
     render, and depending on it would hand the same share over twice. */
  useEffect(() => {
    if (!hasShareIntent) return;
    const intent = shareIntent;
    resetShareIntent();
    shareTargetUsed();
    /* A screenshot is read on the phone, and its words go on like shared text. */
    const image = intent.files?.find((f) => f.mimeType?.startsWith("image/"));
    if (image) {
      void readScreenshot(image.path).then((text) => latest.current({ ...(text ? { text } : {}), from: "screenshot" }));
      return;
    }
    const share = fromShare(intent);
    if (share) latest.current(share);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, shareIntent]);
}
