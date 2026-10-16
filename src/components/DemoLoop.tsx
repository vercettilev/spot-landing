"use client";

import { useEffect, useRef, useState } from "react";
import { SpotPuppy } from "./SpotPuppy";
import styles from "./PhoneDemo.module.css";

/* The clock, in milliseconds: one loop per app, three apps. Each loop has
   four steps, starting at the module's 0%, 20%, 40% and 81.33% of --t; while
   the clock is held, a step shows its clearest frame instead (Share lit,
   Spot lit, Ape lit, the app again). */
const LOOP = 15_000;
const STEP_STARTS = [0, 3_000, 6_000, 12_200];
const STEP_STILLS = [2_000, 4_800, 9_400, 14_600];

/* The step words that follow "See it on …", the same in every app. */
const SAYS = ["Share to Spot.", "Ape.", "Keep scrolling."];

const Chevron = ({ back = false }: { back?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={back ? "M14.5 6l-6 6 6 6" : "M9.5 6l6 6-6 6"} />
  </svg>
);

/**
 * THE PHONE DEMO'S CLOCK AND ITS CONTROLS: the puppy on top, the phone (drawn
 * on the server and passed in), and under it the apps the loop goes through,
 * the step in words between a back and an on arrow, and a Pause button.
 *
 * The loop runs by itself, through each app in turn. The arrows move it a
 * step either way and an app's name jumps to it, and it carries on from
 * there. They move the CSS clock itself: every animation in the phone and
 * the caption is set to the same moment, so nothing falls out of step.
 *
 * The clock can be stopped. Anything that moves for more than five seconds
 * beside other content needs a way to stop it (WCAG 2.2.2), so the caption
 * carries a Pause button and a tap on the phone does the same. It also stops
 * by itself when the phone scrolls out of view: a loop running three screens
 * below the fold runs for nobody.
 */
export function DemoLoop({ apps, children }: { apps: { name: string; icon: React.ReactNode }[]; children: React.ReactNode }) {
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
  const total = LOOP * apps.length;

  /* The clock's animations: the phone's and the caption's, not the puppy's,
     whose peek would play again. */
  const clock = () => {
    const el = figure.current;
    if (!el || typeof el.getAnimations !== "function" || typeof CSSAnimation === "undefined") return [];
    return el
      .getAnimations({ subtree: true })
      .filter((a): a is CSSAnimation => a instanceof CSSAnimation && !(a.effect as KeyframeEffect | null)?.target?.closest(`.${styles.pup}`));
  };

  const seek = (all: CSSAnimation[], app: number, step: number) => {
    const t = app * LOOP + (held ? STEP_STILLS[step]! : STEP_STARTS[step]!);
    for (const a of all) a.currentTime = t;
  };

  const step = (by: 1 | -1) => {
    const all = clock();
    if (!all.length) return;
    const now = Number(all[0]!.currentTime ?? 0) % total;
    const app = Math.floor(now / LOOP);
    const at = STEP_STARTS.reduce((current, s, i) => (now - app * LOOP >= s ? i : current), 0);
    const to = (app * STEP_STARTS.length + at + by + apps.length * STEP_STARTS.length) % (apps.length * STEP_STARTS.length);
    seek(all, Math.floor(to / STEP_STARTS.length), to % STEP_STARTS.length);
  };

  const show = (app: number) => {
    const all = clock();
    if (all.length) seek(all, app, 0);
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
        <span className={styles.rail}>
          {apps.map((a, i) => (
            <button key={a.name} type="button" className={styles.railKey} onClick={() => show(i)} aria-label={`Show it on ${a.name}`}>
              <i className={`${styles.railOn} ${styles[`on${i}`]}`} aria-hidden="true" />
              {a.icon}
              <span className={styles.railName}>{a.name}</span>
            </button>
          ))}
        </span>
        <span className={styles.steps}>
          <button type="button" className={styles.arrow} onClick={() => step(-1)} aria-label="Previous step">
            <Chevron back />
          </button>
          <span className={styles.says}>
            {apps.map((a, i) => (
              <span key={a.name} className={`${styles.see} ${styles[`see${i}`]}`}>
                See it on {a.name}.{" "}
              </span>
            ))}
            {SAYS.map((words, i) => (
              <span key={words} className={styles[`say${i + 2}`]}>
                {words}{" "}
              </span>
            ))}
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
