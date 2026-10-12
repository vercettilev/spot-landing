import { useEffect, useRef } from "react";
import { fromShare } from "./logic";
import type { Share } from "./types";

/* The web build has no share sheet. It exists to look at the screens, so a
   share is read from the address instead: /?url=…&text=… */
export function useIncomingShare(onShare: (share: Share) => void): void {
  const latest = useRef(onShare);
  latest.current = onShare;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const share = fromShare({ webUrl: q.get("url"), text: q.get("text") });
    if (share) latest.current(share);
  }, []);
}
