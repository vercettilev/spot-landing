"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { parseCode, type Spot } from "@/lib/referral";
import { PLATFORM_LABEL, PLATFORMS, type Platform } from "@/lib/waitlist";
import { SpotPass, type PassMode } from "./SpotPass";
import styles from "./SpotForm.module.css";

const ERRORS: Record<string, string> = {
  invalid_email: "That address doesn't look right.",
  invalid_platform: "Pick your phone.",
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

/**
 * THE ONE THING ON THE PAGE THAT ASKS FOR SOMETHING: an address and a phone.
 *
 * The phone is preselected from the device when it can be told (an iPhone
 * says so; a Seeker reads as Android, so Seeker owners pick it themselves),
 * because the answer decides which build ships first and a default the
 * reader has to fix is better than a blank they skip.
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
  const [thud, setThud] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const card = useRef<HTMLDivElement>(null);
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
        morphFrom.current = card.current?.getBoundingClientRect().height ?? null;
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

  /* THE CARD CHANGES HEIGHT SMOOTHLY between the form and the pass, instead
     of jumping: measured before the swap, animated to the new height after. */
  useLayoutEffect(() => {
    const el = card.current;
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
    if (!platform) {
      setStatus("error");
      setError(ERRORS.invalid_platform);
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, platform, website, ref: invitedBy ?? undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const already = Boolean(data.already_registered);
        const got: Spot | null = data.spot ?? null;
        const moving = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        morphFrom.current = card.current?.getBoundingClientRect().height ?? null;
        /* The form fades out over the pass as it arrives (a cross-fade), so
           the card is never empty in between. */
        if (moving) {
          setLeaving(true);
          setTimeout(() => setLeaving(false), 260);
        }
        setSpot(got);
        setMode(already ? "already" : "new");
        setLastRank(null);
        setStatus("done");
        remember(SAW_REF, null);
        if (got) {
          remember(MY_CODE, got.code);
          remember(MY_LAST, String(got.rank));
        }
        if (moving) {
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

  function reset() {
    remember(MY_CODE, null);
    remember(MY_LAST, null);
    morphFrom.current = card.current?.getBoundingClientRect().height ?? null;
    setSpot(null);
    setEmail("");
    setThud(false);
    setStatus("idle");
  }

  const form = (ghost: boolean) => (
    <form onSubmit={submit} aria-hidden={ghost || undefined} inert={ghost || undefined}>
      <h2 className={styles.title}>Get early access</h2>
      {invitedBy && <p className={styles.invited}>A friend sent you. Joining moves them up the line.</p>}

      <label className={styles.label} htmlFor="spot-email">
        Email
      </label>
      <input
        id="spot-email"
        className={styles.input}
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>Your phone</legend>
        <div className={styles.platforms}>
          {PLATFORMS.map((p) => (
            <label key={p} className={`${styles.platform} ${platform === p ? styles.platformOn : ""}`}>
              <input
                type="radio"
                name="platform"
                value={p}
                checked={platform === p}
                onChange={() => setPlatform(p)}
              />
              <span>{PLATFORM_LABEL[p]}</span>
            </label>
          ))}
        </div>
      </fieldset>

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

      <button className={styles.submit} type="submit" disabled={status === "sending" || ghost}>
        {status === "sending" || ghost ? "Adding you…" : "Get early access"}
      </button>
      {status === "error" && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className={styles.fine}>We&apos;ll email you when Spot is ready for your phone.</p>
    </form>
  );

  return (
    <div ref={card} className={`${styles.card} ${thud && status === "done" ? styles.thud : ""}`}>
      {status === "done" ? (
        <>
          <SpotPass spot={spot} mode={mode} platform={platform} lastRank={lastRank} shareUrl={shareUrl} onReset={reset} />
          {leaving && <div className={styles.ghost}>{form(true)}</div>}
        </>
      ) : (
        form(false)
      )}
    </div>
  );
}
