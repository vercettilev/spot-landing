"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PLATFORM_LABEL, PLATFORMS, type Platform } from "@/lib/waitlist";
import styles from "./SpotForm.module.css";

const PHONE_NAME: Record<Platform, string> = { iphone: "your iPhone", android: "your Android phone", seeker: "your Seeker" };

const ERRORS: Record<string, string> = {
  invalid_email: "That address doesn't look right.",
  invalid_platform: "Pick your phone.",
  rate_limited: "Too many tries. Give it a minute.",
  forbidden: "We couldn't verify this browser. Please try again.",
};

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
  const [already, setAlready] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) setPlatform((p) => p ?? "iphone");
    else if (/Android/i.test(ua)) setPlatform((p) => p ?? "android");
  }, []);

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
        body: JSON.stringify({ email, platform, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setAlready(Boolean(data.already_registered));
        setStatus("done");
        return;
      }
      setStatus("error");
      setError(ERRORS[data.error] ?? "Something went wrong. Please try again.");
    } catch {
      setStatus("error");
      setError("Couldn't send that. Check your connection and try again.");
    }
  }

  if (status === "done" && platform) {
    const tweet = `Spot: the buy button for every app. See a stock or coin on TikTok, Reddit or X, buy it without leaving the app.`;
    return (
      <div className={styles.card} role="status">
        <p className={styles.doneTitle}>{already ? "You're already on the list." : "You're on the list."}</p>
        <p className={styles.doneText}>
          {already
            ? `We've noted ${PLATFORM_LABEL[platform]} as your phone.`
            : `We'll email you when Spot is ready for ${PHONE_NAME[platform]}.`}
        </p>
        <p className={styles.shareLabel}>Know someone who trades from their feed?</p>
        <div className={styles.shareRow}>
          <a
            className={styles.shareBtn}
            href={`https://x.com/intent/post?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on X
          </a>
          <button
            type="button"
            className={styles.shareBtn}
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl).then(() => setCopied(true), () => {});
            }}
          >
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={submit}>
      <h2 className={styles.title}>Get early access</h2>

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

      <button className={styles.submit} type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Adding you…" : "Get early access"}
      </button>
      {status === "error" && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className={styles.fine}>We&apos;ll email you when Spot is ready for your phone.</p>
    </form>
  );
}
