"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { REF_BONUS, parseCode, type Spot } from "@/lib/referral";
import { looksLikeEmail, type Platform } from "@/lib/waitlist";
import { SpotPass, type PassMode } from "./SpotPass";
import styles from "./SpotForm.module.css";

const ERRORS: Record<string, string> = {
  invalid_email: "That address doesn't look right.",
  invalid_platform: "Something went wrong. Please try again.",
  rate_limited: "Too many tries. Give it a minute.",
  forbidden: "We couldn't verify this browser. Please try again.",
};

/* What this browser remembers: the link that brought it, and its own code
   and last seen place once it joined, so a return visit shows the place
   instead of the form. "Not you?" forgets both. */
const SAW_REF = "spot:ref";
const MY_CODE = "spot:me";
const MY_LAST = "spot:last";
const remember = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
};
const recall = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/* The moment the stamp hits the paper (SpotPass.module.css: 0.74s + 55% of
   0.46s). The card dips and the puppy barks on it. */
const IMPACT_MS = 990;

/* The puppy on the phone watches the field: ears up while someone types, a
   grin once the address looks right (SpotPuppy listens). */
type Mood = "rest" | "alert" | "happy";
const setMood = (mood: Mood) => window.dispatchEvent(new CustomEvent<Mood>("spot:mood", { detail: mood }));

/**
 * THE ONE THING ON THE PAGE THAT ASKS FOR SOMETHING: an address. One field,
 * one button, and under them the one way up the line: friends.
 *
 * The phone is read from the device when it can be told (an iPhone or an
 * Android says so) and sent along. A desktop cannot tell, so it sends none
 * and the pass asks after joining, one tap, once the question no longer
 * stands between anyone and the list.
 */
export function SpotForm({ shareUrl }: { shareUrl: string }) {
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [website, setWebsite] = useState(""); // the honeypot: off-screen, never focused
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [spot, setSpot] = useState<Spot | null>(null);
  const [mode, setMode] = useState<PassMode>("new");
  const [lastRank, setLastRank] = useState<number | null>(null);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [thud, setThud] = useState(false);
  const slot = useRef<HTMLDivElement>(null);
  const morphFrom = useRef<number | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) setPlatform((p) => p ?? "iphone");
    else if (/Android/i.test(ua)) setPlatform((p) => p ?? "android");

    /* A shared link lands here as /?r=CODE. Keep the code, then take it off
       the address bar so this page's own URL is not passed on with it. */
    const url = new URL(window.location.href);
    const fromLink = parseCode(url.searchParams.get("r"));
    if (fromLink) {
      remember(SAW_REF, fromLink);
      url.searchParams.delete("r");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    const mine = parseCode(recall(MY_CODE));
    const ref = fromLink ?? parseCode(recall(SAW_REF));
    if (ref && ref !== mine) setInvitedBy(ref);

    /* Back again: show where they stand now instead of the form. */
    if (!mine) return;
    const last = Number(recall(MY_LAST)) || null;
    fetch(`/api/waitlist?code=${mine}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: { spot?: Spot }) => {
        if (!data.spot) return;
        morphFrom.current = slot.current?.getBoundingClientRect().height ?? null;
        setLastRank(last);
        setSpot(data.spot);
        setMode("back");
        setStatus("done");
        remember(MY_LAST, String(data.spot.rank));
      })
      .catch((code) => {
        if (code === 404) remember(MY_CODE, null); // a code the line no longer knows
      });
  }, []);

  const valid = looksLikeEmail(email);
  useEffect(() => {
    if (status === "done") return;
    setMood(valid ? "happy" : typing ? "alert" : "rest");
  }, [valid, typing, status]);

  /* THE SLOT CHANGES HEIGHT SMOOTHLY between the form and the pass, instead
     of jumping: measured before the swap, animated to the new height after. */
  useLayoutEffect(() => {
    const el = slot.current;
    const from = morphFrom.current;
    morphFrom.current = null;
    if (!el || from === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const to = el.getBoundingClientRect().height;
    if (Math.abs(to - from) < 2) return;
    el.style.height = `${from}px`;
    el.style.overflow = "hidden";
    void el.offsetHeight;
    el.style.transition = "height 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)";
    el.style.height = `${to}px`;
    const done = () => {
      el.style.height = "";
      el.style.overflow = "";
      el.style.transition = "";
    };
    const t = setTimeout(done, 520);
    return () => {
      clearTimeout(t);
      done();
    };
  }, [status, mode]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, platform: platform ?? undefined, website, ref: invitedBy ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const already = Boolean(data.already_registered);
        const got: Spot | null = data.spot ?? null;
        morphFrom.current = slot.current?.getBoundingClientRect().height ?? null;
        setSpot(got);
        setMode(already ? "already" : "new");
        setLastRank(null);
        setStatus("done");
        setMood("rest");
        remember(SAW_REF, null);
        if (got) {
          remember(MY_CODE, got.code);
          remember(MY_LAST, String(got.rank));
        }
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setThud(true);
          window.dispatchEvent(new CustomEvent("spot:cheer", { detail: { at: IMPACT_MS } }));
        }
        return;
      }
      setStatus("error");
      setError(ERRORS[data.error] ?? "Something went wrong. Please try again.");
    } catch {
      setStatus("error");
      setError("Couldn't send that. Check your connection and try again.");
    }
  }

  /* The phone, picked on the pass after joining: the same address again with
     the phone named, which the list files as an update. Best-effort. */
  function savePlatform(p: Platform) {
    setPlatform(p);
    fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, platform: p, website }),
    }).catch(() => {});
  }

  function reset() {
    remember(MY_CODE, null);
    remember(MY_LAST, null);
    morphFrom.current = slot.current?.getBoundingClientRect().height ?? null;
    setSpot(null);
    setEmail("");
    setThud(false);
    setStatus("idle");
  }

  return (
    <div ref={slot} className={styles.slot}>
      {status === "done" ? (
        <div className={`${styles.card} ${thud ? styles.thud : ""}`}>
          <SpotPass
            spot={spot}
            mode={mode}
            platform={platform}
            lastRank={lastRank}
            shareUrl={shareUrl}
            onReset={reset}
            onPlatform={mode !== "back" && email ? savePlatform : undefined}
          />
        </div>
      ) : (
        <form onSubmit={submit} className={styles.form}>
          {invitedBy && <p className={styles.invited}>A friend sent you. Joining moves them up the line.</p>}
          <div className={styles.row}>
            <label className={styles.sr} htmlFor="spot-email">
              Email
            </label>
            <input
              id="spot-email"
              className={styles.input}
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setTyping(true)}
              onBlur={() => setTyping(false)}
            />
            <button className={styles.submit} type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Saving…" : "Save my spot"}
            </button>
          </div>

          <input
            className={styles.honeypot}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />

          {status === "error" ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : (
            <p className={styles.helper}>
              <svg className={styles.up} viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                <circle cx="12" cy="12" r="12" fill="currentColor" />
                <path d="M12 17.5V7M7.5 11.5 12 7l4.5 4.5" fill="none" stroke="#0b0b0c" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Friends who join move you up {REF_BONUS}&nbsp;spots.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
