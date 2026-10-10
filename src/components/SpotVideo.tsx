"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SpotVideo.module.css";

/**
 * The 23-second film, playing muted as browsers require. Turning the sound on
 * starts it from the top, because the barks and the drop are timed to the
 * picture and joining mid-bar is half the joke missed. Reduced motion gets
 * the poster and the controls instead of a loop.
 */
export function SpotVideo({ note }: { note?: React.ReactNode }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [still, setStill] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      ref.current?.pause();
    }
  }, []);

  function toggleSound() {
    const v = ref.current;
    if (!v) return;
    if (muted) {
      v.muted = false;
      v.currentTime = 0;
      v.play().catch(() => {});
    } else {
      v.muted = true;
    }
    setMuted(!muted);
  }

  return (
    <div>
      <div className={styles.frame}>
        <video
          ref={ref}
          className={styles.video}
          src="/spot-promo.mp4"
          poster="/spot-promo-poster.jpg"
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          controls={still}
          aria-label="Spot in 23 seconds: share a post, tap Spot, confirm, and Spot growls at a scam coin."
        />
      </div>
      <div className={styles.under}>
        {!still && (
          <button type="button" className={styles.sound} onClick={toggleSound} aria-pressed={!muted}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" />
              {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12" />}
            </svg>
            {muted ? "Sound on" : "Sound off"}
          </button>
        )}
        {note}
      </div>
    </div>
  );
}
