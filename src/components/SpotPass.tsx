"use client";

import { useEffect, useId, useRef, useState } from "react";
import { REF_BONUS, displayLink, referralLink, type Spot } from "@/lib/referral";
import { X_HANDLE, X_URL } from "@/lib/site";
import { PLATFORM_LABEL, PLATFORMS, type Platform } from "@/lib/waitlist";
import { XMark } from "./XMark";
import styles from "./SpotPass.module.css";

const PHONE_NAME: Record<Platform, string> = { iphone: "your iPhone", android: "your Android phone", seeker: "your Seeker" };

/** new: just joined. already: typed an address that was on the list. back: came back to look. */
export type PassMode = "new" | "already" | "back";

const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * THE INK STAMP. Drawn, not typed: a ring of type around a paw, run through
 * two noise filters so the edge bleeds and the fill misses the paper in
 * places, the way a rubber stamp does. It lands once, on a new signup.
 */
function Stamp({ slam }: { slam: boolean }) {
  const id = "st" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg className={`${styles.stamp} ${slam ? styles.slam : styles.settled}`} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <path id={`${id}r`} d="M60 60 m-42 0 a42 42 0 1 1 84 0 a42 42 0 1 1 -84 0" />
        <filter id={`${id}f`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="4" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.1 1.85" result="gaps" />
          <feComposite in="SourceGraphic" in2="gaps" operator="in" result="inked" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed="9" result="warp" />
          <feDisplacementMap in="inked" in2="warp" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter={`url(#${id}f)`}>
        <circle cx="60" cy="60" r="56" fill="none" stroke="currentColor" strokeWidth="3.4" />
        <circle cx="60" cy="60" r="33" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <text className={styles.stampText} fill="currentColor">
          <textPath href={`#${id}r`} textLength="262" lengthAdjust="spacing">
            SPOT · EARLY ACCESS · SPOT · EARLY ACCESS ·
          </textPath>
        </text>
        <g fill="currentColor">
          <path d="M60 58.5c-6.6 0-12.6 6.4-13.6 11.6-.8 4.2 2.2 6.7 6.1 6 2.6-.5 4.8-1.6 7.5-1.6s4.9 1.1 7.5 1.6c3.9.7 6.9-1.8 6.1-6-1-5.2-7-11.6-13.6-11.6Z" />
          <ellipse cx="45.2" cy="55.6" rx="4.4" ry="5.8" transform="rotate(-24 45.2 55.6)" />
          <ellipse cx="53.6" cy="47.6" rx="4.6" ry="6.2" transform="rotate(-8 53.6 47.6)" />
          <ellipse cx="66.4" cy="47.6" rx="4.6" ry="6.2" transform="rotate(8 66.4 47.6)" />
          <ellipse cx="74.8" cy="55.6" rx="4.4" ry="5.8" transform="rotate(24 74.8 55.6)" />
        </g>
      </g>
    </svg>
  );
}

/**
 * THE PLACE, ON A COUNTER: each digit a wheel that spins and stops, the ones
 * spinning longest, like a deli ticket machine. Rolls from `from` to `value`
 * once; for reduced motion it just shows the number.
 */
function Odometer({ value, from, roll }: { value: number; from: number; roll: boolean }) {
  const text = value.toLocaleString("en-US");
  const start = Math.max(0, from).toLocaleString("en-US");
  const offset = start.length - text.length; // line the old number up from the right
  const digitsTotal = text.replace(/\D/g, "").length;
  const [landed, setLanded] = useState(!roll);

  useEffect(() => {
    if (!roll) return;
    let raf = requestAnimationFrame(() => (raf = requestAnimationFrame(() => setLanded(true))));
    return () => cancelAnimationFrame(raf);
  }, [roll]);

  let k = digitsTotal; // counts down to 0 at the ones
  return (
    <span className={styles.counter} aria-hidden="true">
      {[...text].map((ch, i) => {
        if (!/\d/.test(ch)) return <span key={i} className={styles.sep}>{ch}</span>;
        k--;
        const target = Number(ch);
        const was = start[i + offset] ?? "";
        const begin = /\d/.test(was) ? Number(was) : 0;
        /* Three strips of 0–9. The ones start a full turn further back than the
           tens, the tens than the rest, so the low digits spin longest. */
        const from0 = (k === 0 ? 0 : k === 1 ? 10 : 20) + begin;
        const to = 20 + target;
        const cell = landed || !roll ? to : from0;
        const ms = k === 0 ? 1100 : k === 1 ? 920 : 760 - Math.min(k, 4) * 30;
        return (
          <span key={i} className={styles.wheel}>
            <span
              className={styles.strip}
              style={{
                transform: `translateY(calc(${-cell} * var(--cell)))`,
                transition: roll ? `transform ${ms}ms cubic-bezier(0.16, 0.74, 0.18, 1) 140ms` : "none",
              }}
            >
              {Array.from({ length: 30 }, (_, n) => (
                <span key={n}>{n % 10}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * THE PHONE, ASKED AFTER JOINING: three taps to pick from when the page could
 * not tell (a desktop), or one to say an Android is a Seeker.
 */
function PhoneAsk({ platform, onPick }: { platform: Platform | null; onPick: (p: Platform) => void }) {
  if (platform === "android") {
    return (
      <button type="button" className={styles.seeker} onClick={() => onPick("seeker")}>
        On a Solana Seeker?
      </button>
    );
  }
  if (platform) return null;
  return (
    <div className={styles.phones}>
      {PLATFORMS.map((p) => (
        <button key={p} type="button" className={styles.phone} onClick={() => onPick(p)}>
          {p === "seeker" ? "Seeker" : PLATFORM_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

/**
 * WHAT A READER SEES ONCE THEY ARE ON THE LIST: their place, the link that
 * moves them up, and the stamp that says it took. `spot` is null when the
 * line is not running; then it is the plain thank-you with a share link.
 * `onPlatform`, when given, lets them name their phone right here.
 */
export function SpotPass({
  spot,
  mode,
  platform,
  lastRank,
  shareUrl,
  onReset,
  onPlatform,
}: {
  spot: Spot | null;
  mode: PassMode;
  platform: Platform | null;
  lastRank: number | null;
  shareUrl: string;
  onReset: () => void;
  onPlatform?: (p: Platform) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [motion] = useState(() => !still()); // only ever rendered in the browser, after the form
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
    return () => clearTimeout(timer.current);
  }, []);

  const link = spot ? referralLink(shareUrl, spot.code) : shareUrl;
  const tweet = spot
    ? "Got my spot in line for Spot: ape any CA from any app, in USDC, no SOL needed."
    : "Spot: ape any CA from any app. Buy or sell in USDC, no SOL needed.";
  /* "via @handle" on the post, so every share also points at Spot's account. */
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(link)}&via=${X_HANDLE}`;
  const copy = () => {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2200);
    }, () => {});
  };
  const share = () => navigator.share?.({ title: "Spot", text: tweet, url: link }).catch(() => {});

  const entering = mode !== "back" && motion;
  const title = mode === "already" ? "You're already on the list." : mode === "back" ? "Welcome back." : "You're on the list.";
  const moved = spot && lastRank && lastRank > spot.rank ? lastRank - spot.rank : 0;
  const ask = mode !== "back" && onPlatform ? <PhoneAsk platform={platform} onPick={onPlatform} /> : null;
  const note =
    mode === "back"
      ? moved
        ? `Up ${moved} ${moved === 1 ? "spot" : "spots"} since you last looked.`
        : null
      : !platform
        ? onPlatform
          ? "Which phone do you use? We'll email you when Spot is ready for it."
          : null
        : mode === "already"
          ? `We've noted ${PLATFORM_LABEL[platform]} as your phone.`
          : `We'll email you when Spot is ready for ${PHONE_NAME[platform]}.`;

  return (
    <div className={`${styles.pass} ${entering ? styles.enter : ""}`} role="status">
      <p className={styles.title}>{title}</p>

      {spot ? (
        <>
          <div className={`${styles.place} ${note ? "" : styles.short}`}>
            <div className={styles.numberRow}>
              <p className={styles.placeLabel}>Your place in line</p>
              <p className={`${styles.number} ${spot.rank >= 10000 ? styles.long : ""}`}>
                <span className={styles.hash} aria-hidden="true">#</span>
                <Odometer value={spot.rank} from={mode === "back" ? (lastRank ?? spot.rank) : 0} roll={motion && (mode !== "back" || moved > 0)} />
                <span className="sr-only">Number {spot.rank.toLocaleString("en-US")} in line.</span>
              </p>
              <Stamp slam={entering} />
            </div>
            {note && (
              <div className={styles.note}>
                <p>{note}</p>
                {ask}
              </div>
            )}
          </div>

          <div className={styles.moveUp}>
            <p className={styles.moveTitle}>Move up the line</p>
            <p className={styles.moveText}>
              Each friend who joins with your link moves you up {REF_BONUS} spots.
            </p>
            <div className={styles.linkRow}>
              <span className={styles.link} title={link}>
                {displayLink(link)}
              </span>
              <button type="button" className={styles.copy} onClick={copy} aria-live="polite">
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className={`${styles.shareRow} ${canShare ? styles.two : ""}`}>
              <a className={styles.shareX} href={intent} target="_blank" rel="noopener noreferrer">
                Share on X
              </a>
              {canShare && (
                <button type="button" className={styles.shareMore} onClick={share}>
                  Send to a friend
                </button>
              )}
            </div>
            {spot.referrals > 0 && (
              <p className={styles.count}>
                {spot.referrals === 1 ? "1 friend has" : `${spot.referrals.toLocaleString("en-US")} friends have`} joined through your link.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className={styles.plain}>
          <Stamp slam={entering} />
          {note && (
            <div className={styles.note}>
              <p>{note}</p>
              {ask}
            </div>
          )}
          <p className={styles.moveTitle}>Know someone who trades from their feed?</p>
          <div className={`${styles.shareRow} ${styles.two}`}>
            <a className={styles.shareX} href={intent} target="_blank" rel="noopener noreferrer">
              Share on X
            </a>
            <button type="button" className={styles.shareMore} onClick={copy}>
              {copied ? "Link copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      <a className={styles.follow} href={X_URL} target="_blank" rel="noopener noreferrer">
        <XMark size={14} />
        <span>
          Follow <b>@{X_HANDLE}</b> for updates
        </span>
      </a>

      {mode === "back" && (
        <button type="button" className={styles.notYou} onClick={onReset}>
          Not you? Use another email
        </button>
      )}
    </div>
  );
}
