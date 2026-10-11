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
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState("in");
          io.disconnect();
        }
      },
      { threshold: 0.5 },
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
