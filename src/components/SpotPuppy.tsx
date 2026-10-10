"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { PUPPY_INNER, PUPPY_INNER_HALO, PUPPY_VIEWBOX } from "./puppyArt";
import styles from "./SpotPuppy.module.css";

const FACES = ["Bl", "Wk", "Hp", "Ag"] as const;
type Face = (typeof FACES)[number] | "";
type Pose = { hy: number; ey: number; face: Face };

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/**
 * ONE BARK, the same curve the video uses. The head pops up, which opens the
 * mouth over the jaw hidden behind it; the eyes squeeze shut; the ears lift a
 * beat later and a little higher, then settle with a wobble. Ears never sit
 * below the head while it is lifted, or the gap behind the outline shows.
 */
function barkPose(dt: number): Pose | null {
  if (dt < 0 || dt > 0.45) return null;
  const hy = 21 * (easeOut(seg(dt, 0, 0.055)) - easeInOut(seg(dt, 0.15, 0.3)));
  const settle = dt > 0.3 ? Math.sin((dt - 0.3) * 42) * 2.2 * (1 - seg(dt, 0.3, 0.45)) : 0;
  const ear = 25 * (easeOut(seg(dt, 0.025, 0.1)) - easeInOut(seg(dt, 0.19, 0.36))) + settle;
  return { hy, ey: Math.max(hy, ear), face: dt < 0.3 ? "Hp" : "" };
}

const SECOND_BARK = 0.29; // "woof woof", matched to woof.mp3

/**
 * THE MASCOT, AND THE PAGE'S ONE TOY. Press it and it barks (calm) or growls
 * (angry), with sound, because the sound is half the character and a press is
 * the only moment a browser lets a page play it.
 *
 * Drawn from the traced logo split into ears, a hidden jaw, head and paws
 * (puppyArt.ts). `halo` adds the white sticker edge its black ears need on a
 * dark ground.
 */
export function SpotPuppy({
  mood = "calm",
  halo = false,
  label,
  className = "",
}: {
  mood?: "calm" | "angry";
  halo?: boolean;
  label: string;
  className?: string;
}) {
  const p = "pup" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const angry = mood === "angry";
  const svgRef = useRef<SVGSVGElement>(null);
  const busy = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [said, setSaid] = useState(0);
  const [growling, setGrowling] = useState(false);

  const rest = useCallback((): Pose => (angry ? { hy: 0, ey: -4, face: "Ag" } : { hy: 0, ey: 0, face: "" }), [angry]);

  /* The resting pose is baked into the markup, so the angry face is already
     angry in the server HTML instead of flashing calm until hydration. */
  const markup = useMemo(() => {
    let html = (halo ? PUPPY_INNER_HALO : PUPPY_INNER).replaceAll("__P__", p);
    if (angry) {
      html = html.replace(`id="${p}Ag" style="display:none"`, `id="${p}Ag" style="display:inline"`);
      for (const id of ["EL", "ER", "ELh", "ERh"]) html = html.replace(`<g id="${p}${id}">`, `<g id="${p}${id}" transform="translate(0 4)">`);
    }
    return html;
  }, [p, halo, angry]);

  const apply = useCallback(
    (pose: Pose) => {
      const svg = svgRef.current;
      if (!svg) return;
      const get = (id: string) => svg.querySelector<SVGGElement>(`[id="${p}${id}"]`);
      const head = `translate(0 ${(-pose.hy).toFixed(2)})`;
      const ears = `translate(0 ${(-pose.ey).toFixed(2)})`;
      for (const [id, tr] of [["Hd", head], ["EL", ears], ["ER", ears]] as const) {
        get(id)?.setAttribute("transform", tr);
        get(id + "h")?.setAttribute("transform", tr);
      }
      for (const f of FACES) {
        const el = get(f);
        if (el) el.style.display = pose.face === f ? "inline" : "none";
      }
    },
    [p],
  );

  /* A blink every few seconds, so it reads as awake. Skipped mid-bark. */
  useEffect(() => {
    if (angry) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        if (!busy.current) {
          apply({ ...rest(), face: "Bl" });
          setTimeout(() => !busy.current && apply(rest()), 130);
        }
        next();
      }, 2600 + Math.random() * 2800);
    };
    next();
    return () => clearTimeout(timer);
  }, [angry, apply, rest]);

  const speak = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setSaid((n) => n + 1);

    const a = audio.current ?? (audio.current = new Audio(angry ? "/grr.mp3" : "/woof.mp3"));
    a.currentTime = 0;
    a.play().catch(() => {});

    if (angry) {
      setGrowling(true);
      setTimeout(() => {
        setGrowling(false);
        busy.current = false;
      }, 1300);
      return;
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      apply({ ...rest(), face: "Hp" });
      setTimeout(() => {
        apply(rest());
        busy.current = false;
      }, 700);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const dt = (now - t0) / 1000;
      const pose = barkPose(dt - SECOND_BARK) || barkPose(dt); // the later bark wins while the first settles
      if (pose) apply(pose);
      if (dt < SECOND_BARK + 0.45) requestAnimationFrame(tick);
      else {
        apply(rest());
        busy.current = false;
      }
    };
    requestAnimationFrame(tick);
  }, [angry, apply, rest]);

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={label}
      className={`${styles.puppy} ${angry ? styles.angry : ""} ${growling ? styles.growling : ""} ${className}`}
    >
      <svg ref={svgRef} viewBox={PUPPY_VIEWBOX} aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{ __html: markup }} />
      {said > 0 && (
        <span key={said} className={`${styles.bubble} ${angry ? styles.bubbleAngry : ""}`} aria-hidden="true">
          {angry ? "GRRR" : "WOOF!"}
        </span>
      )}
    </button>
  );
}
