import { SpotPuppy } from "./SpotPuppy";
import styles from "./PhoneDemo.module.css";

/* Line icons for the mock screens, drawn on a 24-unit grid. */
const Icon = ({ d, size = 24 }: { d: string; size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    style={{ width: `calc(${size} * var(--u))`, height: `calc(${size} * var(--u))` }}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const HEART = "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z";
const BUBBLE = "M4 5h16v11H9l-5 4z";
const SHARE = "M12 15V3M7 8l5-5 5 5M5 13v7h14v-7";
const CHECK = "M5 12.5l4.5 4.5L19 7.5";
const MAIL = "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l9 6 9-6";
const CHAT = "M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4A8 8 0 1 1 20 12z";
const FACE =
  "M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 16a4 4 0 0 0 5 0";

const Tabs = () => (
  <div className={styles.tabs}>
    <span className={styles.dim}>Following</span>
    <span>For you</span>
  </div>
);

/**
 * SPOT, DOING ITS ONE THING, on a loop: a post in a feed, Share, Spot's sheet
 * sniffing the coin while take profit goes on, Face ID, and back to the feed
 * with the buy done and where it came from. The
 * puppy holds the top of the phone the way the logo holds its ledge.
 *
 * Pure CSS: every moving part runs on the same 12-second clock (see the
 * module). Every size inside the phone is a fraction of its width (--u is
 * 1/270 of it), so it scales instead of reflowing. With reduced motion, or
 * before the styles run, it rests on the Confirm screen. The screen is a
 * picture; the caption says the steps.
 */
export function PhoneDemo() {
  return (
    <figure className={styles.demo}>
      <div className={styles.pup}>
        <SpotPuppy halo cheer label="Spot the puppy. Press to make it bark." />
      </div>

      <div className={styles.device}>
        <div className={styles.phone} aria-hidden="true">
          <div className={styles.screen}>
            <div className={`${styles.layer} ${styles.feedA}`}>
              <Tabs />
              <div className={styles.post}>
                <svg className={styles.chart} viewBox="0 0 200 90" preserveAspectRatio="none">
                  <polyline pathLength={1} points="0,80 20,74 40,77 60,60 80,66 100,48 120,53 140,32 160,37 180,16 200,8" />
                </svg>
                <b className={styles.handle}>@ana.trades</b>
                <span className={styles.postText}>$EXAMPLE just broke out. Thoughts?</span>
              </div>
              <div className={styles.rail}>
                <Icon d={HEART} />
                <Icon d={BUBBLE} />
                <span className={styles.shareRing}>
                  <Icon d={SHARE} size={22} />
                  <i className={`${styles.tap} ${styles.tap1}`} />
                </span>
              </div>
            </div>

            <div className={`${styles.layer} ${styles.feedD}`}>
              <Tabs />
              <div className={`${styles.post} ${styles.postWarm}`}>
                <b className={styles.handle}>@dan.cooks</b>
                <span className={styles.postText}>Ten-minute ramen, part 3</span>
              </div>
              <div className={styles.banner}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/spot-icon.svg" alt="" />
                <div>
                  <b>Bought $EXAMPLE</b>
                  <br />
                  25 USDC · from @ana.trades
                </div>
              </div>
            </div>

            <div className={styles.shade} />

            <div className={`${styles.sheet} ${styles.shareSheet}`}>
              <div className={styles.grab} />
              <div className={styles.sheetTitle}>Share</div>
              <div className={styles.apps}>
                <div className={styles.app}>
                  <span className={styles.tile}>
                    <Icon d={CHAT} size={20} />
                  </span>
                  Messages
                </div>
                <div className={styles.app}>
                  <span className={styles.tile}>
                    <Icon d={MAIL} size={20} />
                  </span>
                  Mail
                </div>
                <div className={`${styles.app} ${styles.appSpot}`}>
                  <span className={styles.tileSpot}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/spot-icon.svg" alt="" />
                    <i className={`${styles.tap} ${styles.tap2}`} />
                  </span>
                  Spot
                </div>
                <div className={styles.app}>
                  <span className={styles.tile}>
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "calc(20 * var(--u))", height: "calc(20 * var(--u))" }}>
                      <circle cx="6" cy="12" r="1.8" />
                      <circle cx="12" cy="12" r="1.8" />
                      <circle cx="18" cy="12" r="1.8" />
                    </svg>
                  </span>
                  More
                </div>
              </div>
              <div className={styles.actions}>
                <div>Copy link</div>
                <div>Save video</div>
              </div>
            </div>

            <div className={`${styles.sheet} ${styles.buySheet}`}>
              <div className={styles.grab} />
              <div className={styles.buyHead}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/spot-icon.svg" alt="" />
                $EXAMPLE
                <span className={styles.side}>
                  <b>Buy</b>
                  <span>Sell</span>
                </span>
              </div>
              <div className={styles.amount}>
                25 <span>USDC</span>
              </div>
              <div className={styles.chips}>
                <span>10</span>
                <span className={styles.chipOn}>25</span>
                <span>50</span>
              </div>
              <div className={styles.tp}>
                <span>Sell half at 2×</span>
                <i className={styles.toggle}>
                  <i className={`${styles.tap} ${styles.tap4}`} />
                </i>
              </div>
              <div className={styles.checks}>
                <span className={styles.sniffing}>Sniffing it first…</span>
                <span className={styles.passed}>
                  <Icon d={CHECK} size={16} />
                  Four checks passed
                </span>
              </div>
              <div className={styles.confirm}>
                <span className={styles.faceLabel}>
                  <Icon d={FACE} size={16} />
                  Confirm with Face ID
                </span>
                <span className={styles.doneLabel}>
                  <Icon d={CHECK} size={16} />
                  Done
                </span>
                <i className={`${styles.tap} ${styles.tap3}`} />
              </div>
            </div>
          </div>
        </div>
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
          <span className={styles.say3}>Confirm.</span>{" "}
          <span className={styles.say4}>Keep scrolling.</span>
        </span>
      </figcaption>
    </figure>
  );
}
