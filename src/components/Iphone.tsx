import styles from "./Iphone.module.css";

/* The status bar's three marks, as iOS draws them, in the text's colour. */
const Signal = () => (
  <svg viewBox="0 0 18 12" className={styles.signal}>
    <rect x="0" y="7.5" width="3" height="4.5" rx="1" />
    <rect x="5" y="5" width="3" height="7" rx="1" />
    <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
    <rect x="15" y="0" width="3" height="12" rx="1" />
  </svg>
);

const Wifi = () => (
  <svg viewBox="0 0 17 12" className={styles.wifi}>
    <path d="M8.5 2.3c2.3 0 4.4.9 6 2.4l1.2-1.2C13.8 1.6 11.3.6 8.5.6S3.2 1.6 1.3 3.5l1.2 1.2c1.6-1.5 3.7-2.4 6-2.4zM8.5 5.6c1.4 0 2.6.5 3.6 1.4l1.2-1.2C12 4.6 10.3 3.9 8.5 3.9s-3.5.7-4.8 1.9l1.2 1.2c1-.9 2.2-1.4 3.6-1.4zM8.5 8.8c.6 0 1.1.2 1.5.6L8.5 11 7 9.4c.4-.4.9-.6 1.5-.6z" />
  </svg>
);

const Battery = () => (
  <svg viewBox="0 0 28 13" className={styles.battery}>
    <rect x=".5" y=".5" width="23.5" height="12" rx="3.8" fill="none" stroke="currentColor" strokeOpacity=".38" />
    <rect x="2.2" y="2.2" width="20.1" height="8.6" rx="2.4" />
    <path d="M25.4 4.4v4.2c.8-.3 1.4-1.1 1.4-2.1s-.6-1.8-1.4-2.1z" fillOpacity=".45" />
  </svg>
);

/**
 * THE TOP OF THE SCREEN: the time on the left, signal, Wi-Fi and battery on
 * the right, in black over a light app and white over a dark one. `back`
 * puts iOS's way back to the app that sent you ("◀ X") where the time was;
 * `bare` leaves the left empty, as the lock screen does under its clock.
 */
export function StatusBar({
  tone,
  back,
  bare = false,
  className = "",
}: {
  tone: "dark" | "light";
  back?: string;
  bare?: boolean;
  className?: string;
}) {
  return (
    <div className={`${styles.status} ${styles[tone]} ${className}`} aria-hidden="true">
      {back ? (
        <span className={styles.back}>
          <svg viewBox="0 0 7 10">
            <path d="M5.6 1 1.6 5l4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {back}
        </span>
      ) : bare ? null : (
        <span className={styles.time}>9:41</span>
      )}
      <span className={styles.icons}>
        <Signal />
        <Wifi />
        <Battery />
      </span>
    </div>
  );
}

/** The bar along the bottom that a swipe takes you home with. */
export function HomeBar({ tone, className = "" }: { tone: "dark" | "light"; className?: string }) {
  return <i className={`${styles.homeBar} ${styles[tone]} ${className}`} />;
}

/**
 * AN IPHONE 17 PRO IN COSMIC ORANGE, drawn: the titanium frame and its keys,
 * the black bezel, the screen and the Dynamic Island over it. Inside, --u is
 * one iOS point (the frame is 428 wide, the screen 402 by 874), so a screen
 * drawn in the app's own numbers sits right at any width, and scales instead
 * of reflowing. What is on the screen is the caller's. By default it is a
 * picture, hidden from screen readers, with its meaning said in words beside
 * it; `decorative={false}` leaves real text inside it (the lock screen's
 * notifications) for them to read.
 */
export function Iphone({
  className = "",
  decorative = true,
  children,
}: {
  className?: string;
  decorative?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.device} ${className}`} aria-hidden={decorative || undefined}>
      <div className={styles.phone}>
        <i className={`${styles.key} ${styles.action}`} />
        <i className={`${styles.key} ${styles.volUp}`} />
        <i className={`${styles.key} ${styles.volDown}`} />
        <i className={`${styles.key} ${styles.side}`} />
        <i className={`${styles.key} ${styles.camera}`} />
        <div className={styles.bezel} />
        <div className={styles.screen}>
          {children}
          <i className={styles.island} />
        </div>
      </div>
    </div>
  );
}
