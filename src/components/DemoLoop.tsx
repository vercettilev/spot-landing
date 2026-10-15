"use client";

import { useEffect, useRef, useState } from "react";
import { SpotPuppy } from "./SpotPuppy";
import styles from "./PhoneDemo.module.css";

/**
 * THE PHONE DEMO'S CLOCK AND ITS CONTROLS: the puppy on top, the phone (drawn
 * on the server and passed in), and the caption with its four bars, the step
 * in words and a Pause button.
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
        <span className={styles.bars} aria-hidden="true">
          <i className={styles.bar1} />
          <i className={styles.bar2} />
          <i className={styles.bar3} />
          <i className={styles.bar4} />
        </span>
        <span className={styles.says}>
          <span className={styles.say1}>See it.</span>{" "}
          <span className={styles.say2}>Share to Spot.</span>{" "}
          <span className={styles.say3}>Ape.</span>{" "}
          <span className={styles.say4}>Keep scrolling.</span>
        </span>
        <button type="button" className={styles.pause} onClick={toggle}>
          {held ? "Play" : "Pause"}
        </button>
      </figcaption>
    </figure>
  );
}
