import { Iphone, StatusBar } from "./Iphone";
import { Reveal } from "./Reveal";
import styles from "./LockScreen.module.css";

/* A notification as iOS lays it on the lock screen: the app's icon, the
   title in bold with how long ago beside it, the line under it. */
function Notice({ title, text, when }: { title: string; text: string; when: string }) {
  return (
    <div className={styles.card}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.icon} src="/spot-icon.svg" alt="" width={38} height={36} />
      <div className={styles.words}>
        <p className={styles.top}>
          <b>{title}</b>
          <span>{when}</span>
        </p>
        <p className={styles.text}>{text}</p>
      </div>
    </div>
  );
}

/**
 * THE NIGHT IT DOUBLES, on a locked iPhone, close up: the clock, and under it
 * Spot's two pings, newest on top. The 2x came an hour ago; the dump alert
 * drops in on top of it, once, when the phone scrolls into view (Reveal).
 * The phone fades out below the pings, where nothing else is. It is a
 * picture; the notifications are real text, a list a screen reader can read.
 */
export function LockScreen() {
  return (
    <div className={styles.frame}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.crop}>
        <Iphone decorative={false}>
          <div className={styles.wall} aria-hidden="true" />
          <StatusBar tone="light" bare />
          <div className={styles.head} aria-hidden="true">
            <svg className={styles.lock} viewBox="0 0 14 18">
              <rect x="1" y="7.5" width="12" height="9.5" rx="2.2" fill="currentColor" />
              <path d="M3.6 7.5V5.2a3.4 3.4 0 0 1 6.8 0v2.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <p className={styles.date}>Tuesday, January 9</p>
            <p className={styles.clock}>9:41</p>
          </div>
          <ul className={styles.list} aria-label="Example notifications from Spot">
            <li>
              <Reveal className={styles.drop}>
                <Notice title="GRRR." text="The dev is dumping $NOODLE. Sell the rest?" when="now" />
              </Reveal>
            </li>
            <li>
              <Notice title="$NOODLE doubled." text="Sold half, so your $25 is back. The rest rides." when="1h ago" />
            </li>
          </ul>
        </Iphone>
      </div>
    </div>
  );
}
