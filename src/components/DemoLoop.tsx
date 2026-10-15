"use client";

import { useEffect, useRef, useState } from "react";
import { SpotPuppy } from "./SpotPuppy";
import styles from "./PhoneDemo.module.css";

/* The clock's length and its four steps, in milliseconds: where each starts
   (the module's 0%, 20%, 40% and 81.33% of --t) and, for a held clock, the
   frame that shows the step best: Share lit, Spot lit, Ape lit, the feed. */
const LOOP = 15_000;
const STEPS = [
  { start: 0, still: 2_000 },
  { start: 3_000, still: 4_800 },
  { start: 6_000, still: 9_400 },
  { start: 12_200, still: 14_600 },
] as const;

const Chevron = ({ back = false }: { back?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={back ? "M14.5 6l-6 6 6 6" : "M9.5 6l6 6-6 6"} />
  </svg>
);

/**
 * THE PHONE DEMO'S CLOCK AND ITS CONTROLS: the puppy on top, the phone (drawn
 * on the server and passed in), and the caption: the step in words between
 * a back and an on arrow, and a Pause button.
 *
 * The loop runs by itself; the arrows move it a step either way, the way a
 * story moves on a tap, and it carries on from there. They move the CSS
 * clock itself: every animation in the phone and the caption is set to the
 * same moment, so nothing falls out of step. While the clock is held, a step
 * shows its clearest frame instead of its first.
 *
 * The clock can be stopped. Anything that moves for more than five seconds
 * beside other content needs a way to stop it (WCAG 2.2.2), so the caption
 * carries a Pause button and a tap on the phone does the same. It also stops
 * by itself when the phone scrolls out of view: a loop running three screens
 * below the fold runs for nobody.
 */
export function DemoLoop({ children }: { children: React.ReactNode }) {
  const figure = useRef<HTMLElement>(null);
  const [held, setHeld] = useState(false); // stopped by the reader
  const [away, setAway] = useState(false); // scrolled out of view

  useEffect(() => {
    const el = figure.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    /* 100px of margin, so the loop is already running when the phone arrives. */
    const io = new IntersectionObserver(([e]) => setAway(!e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const paused = held || away;
  const toggle = () => setHeld((v) => !v);

  /* The clock's animations: the phone's and the caption's, not the puppy's,
     whose peek would play again. */
  const clock = () => {
    const el = figure.current;
    if (!el || typeof el.getAnimations !== "function" || typeof CSSAnimation === "undefined") return [];
    return el
      .getAnimations({ subtree: true })
      .filter((a): a is CSSAnimation => a instanceof CSSAnimation && !(a.effect as KeyframeEffect | null)?.target?.closest(`.${styles.pup}`));
  };

  const step = (by: 1 | -1) => {
    const all = clock();
    if (!all.length) return;
    const now = Number(all[0]!.currentTime ?? 0) % LOOP;
    const at = STEPS.reduce((current, s, i) => (now >= s.start ? i : current), 0);
    const to = STEPS[(at + by + STEPS.length) % STEPS.length]!;
    const t = held ? to.still : to.start;
    for (const a of all) a.currentTime = t;
  };

  return (
    <figure ref={figure} className={`${styles.demo}${paused ? ` ${styles.paused}` : ""}`}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.pup}>
        <SpotPuppy halo cheer label="Spot the puppy. Press to make it bark." />
      </div>

      {/* A tap on the phone pauses it, the way a tap on a video does; the
          button in the caption says the same thing out loud. */}
      <div className={styles.stage} onClick={toggle}>
        {children}
      </div>

      <figcaption className={styles.caption}>
        <span className={styles.steps}>
          <button type="button" className={styles.arrow} onClick={() => step(-1)} aria-label="Previous step">
            <Chevron back />
          </button>
          <span className={styles.says}>
            <span className={styles.say1}>See it.</span>{" "}
            <span className={styles.say2}>Share to Spot.</span>{" "}
            <span className={styles.say3}>Ape.</span>{" "}
            <span className={styles.say4}>Keep scrolling.</span>
          </span>
          <button type="button" className={styles.arrow} onClick={() => step(1)} aria-label="Next step">
            <Chevron />
            <svg className={styles.progress} viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="21.25" pathLength={1} />
            </svg>
          </button>
        </span>
        <button type="button" className={styles.pause} onClick={toggle}>
          {held ? "Play" : "Pause"}
        </button>
      </figcaption>
    </figure>
  );
}
