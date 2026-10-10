"use client";

import { useEffect, useRef } from "react";
import styles from "./SpotFilm.module.css";

/**
 * THE 23-SECOND FILM, ON ASK. A link under the headline opens it in a dialog
 * and plays it from the top with the sound on: the barks and the drop are
 * timed to the picture, and the press is what lets a browser play sound.
 * Closing it stops it. Until then nothing but the poster is fetched.
 */
export function SpotFilm() {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const stop = () => video.current?.pause();
    d.addEventListener("close", stop);
    return () => d.removeEventListener("close", stop);
  }, []);

  function open() {
    const d = dialog.current;
    const v = video.current;
    if (!d || !v) return;
    d.showModal();
    v.currentTime = 0;
    v.muted = false;
    v.play().catch(() => {});
  }

  const close = () => dialog.current?.close();

  return (
    <>
      <button type="button" className={styles.watch} onClick={open} aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
          <path d="M8 5l11 7-11 7z" />
        </svg>
        Watch it, 23 seconds
      </button>
      {/* A press on the dimmed page around the film closes it, like Escape. */}
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-label="Spot in 23 seconds"
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <video
          ref={video}
          className={styles.video}
          src="/spot-promo.mp4"
          poster="/spot-promo-poster.jpg"
          controls
          playsInline
          preload="none"
          aria-label="Spot in 23 seconds: share a post, tap Spot, confirm, and Spot growls at a scam coin."
        />
        <div className={styles.bar}>
          <p>Example data.</p>
          <button type="button" className={styles.close} onClick={close}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
