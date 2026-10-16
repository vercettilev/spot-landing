import { Use } from "./marks";
import styles from "./TelegramApp.module.css";

/* A channel post's foot: how many saw it, and when. */
const Seen = ({ views, at }: { views: string; at: string }) => (
  <span className={styles.seen}>
    <Use name="tgEye" className={styles.eye} />
    {views}
    <span>{at}</span>
  </span>
);

/**
 * TELEGRAM ON AN IPHONE: Mika's channel, light, on Telegram's patterned
 * wallpaper. A pinned rule, two posts from the morning, then the SOL call
 * with its chart and the round Share button beside it; once the buy is done,
 * the next post comes up from below.
 */
export function TelegramApp() {
  return (
    <div className={styles.app}>
      <div className={styles.chat}>
        <span className={styles.day}>Today</span>
        <div className={`${styles.post} ${styles.postA}`}>
          <p>gm. coffee first, charts second.</p>
          <Seen views="8.1K" at="8:02" />
        </div>
        <div className={`${styles.post} ${styles.postB}`}>
          <p>$SOL sitting right on 110.</p>
          <p>Watching for a dip.</p>
          <Seen views="10.6K" at="9:12" />
        </div>
        <div className={`${styles.post} ${styles.postCall}`}>
          <Use name="chart" className={styles.media} />
          <p>Buying the $SOL dip under $110.</p>
          <p>Adding a little here.</p>
          <Seen views="12.4K" at="9:38" />
        </div>
        <span className={styles.share}>
          <Use name="tgForward" className={styles.shareIcon} />
        </span>
        <div className={`${styles.post} ${styles.postNext}`}>
          <p>Next stop $120? 👀</p>
          <Seen views="3.1K" at="9:41" />
        </div>
      </div>

      <div className={styles.head}>
        <span className={styles.back}>
          <Use name="tgBack" className={styles.backIcon} />
          <b>12</b>
        </span>
        <span className={styles.title}>
          <b>Mika Onchain</b>
          <span>48,213 subscribers</span>
        </span>
        <span className={styles.avatar}>M</span>
      </div>
      <div className={styles.pinned}>
        <i />
        <span>
          <b>Pinned Message</b>
          <span>Rules: no shilling, DYOR, be nice.</span>
        </span>
      </div>
      <div className={styles.foot}>
        <span>Mute</span>
      </div>
    </div>
  );
}
