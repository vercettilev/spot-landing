"use client";

import { useEffect, useRef, useState } from "react";

/**
 * MARKS A BLOCK THE MOMENT IT SCROLLS INTO VIEW, once, so its CSS can play an
 * entrance there (the GRRR stamp, the receipt printing) instead of on load,
 * offscreen. It is "armed" (entrance pending) only once script runs and only
 * without reduced motion, so nothing is ever hidden from a reader without it.
 */
export function Reveal({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"off" | "armed" | "in">("off");

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setState("armed");
    /* HOW MUCH OF IT HAS TO SHOW. Half, for a block the screen holds twice
       over; less for a tall one. A block taller than two viewports can never
       be half visible, and a fixed 0.5 would leave the sniff report blank on
       a phone held sideways: at 568×320 at most 49.7% of it is ever on
       screen, so the rows stay at opacity 0. The most asked of any block is
       40% of the viewport; the floor keeps a huge one from playing on a
       sliver. */
    const height = el.getBoundingClientRect().height;
    const threshold = height > 0 ? Math.min(0.5, Math.max(0.1, (window.innerHeight * 0.4) / height)) : 0.5;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("in");
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} data-reveal={state}>
      {children}
    </div>
  );
}
