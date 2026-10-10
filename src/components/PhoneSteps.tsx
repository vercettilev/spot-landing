import styles from "./PhoneSteps.module.css";

/* Line icons for the mock screens, drawn on a 24-unit grid. */
const Icon = ({ d, size = 24, fill = false }: { d: string; size?: number; fill?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    style={{ width: `calc(${size} * var(--u))`, height: `calc(${size} * var(--u))` }}
    fill={fill ? "currentColor" : "none"}
    stroke={fill ? "none" : "currentColor"}
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
const FACE =
  "M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 16a4 4 0 0 0 5 0";

function Feed({ handle, text, chart = false, children }: { handle: string; text: string; chart?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`${styles.screen} ${styles.feed}`}>
      <div className={styles.tabs}>
        <span className={styles.dim}>Following</span>
        <span>For you</span>
      </div>
      <div className={`${styles.post} ${chart ? "" : styles.postWarm}`}>
        {chart && (
          <svg className={styles.chart} viewBox="0 0 200 90" preserveAspectRatio="none">
            <polyline points="0,80 20,74 40,77 60,60 80,66 100,48 120,53 140,32 160,37 180,16 200,8" />
          </svg>
        )}
        <b className={styles.handle}>{handle}</b>
        <span className={styles.postText}>{text}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * THE FOUR STEPS, SHOWN RATHER THAN TOLD: a feed, the share sheet, Spot's
 * sheet over it, and the feed again with the buy done. Drawn in HTML so they
 * stay sharp, and every size inside a phone is a fraction of its width
 * (--u is 1/270 of it), so the screens scale with the column instead of
 * reflowing. The screens are pictures; the captions carry the steps.
 */
export function PhoneSteps() {
  return (
    <ol className={styles.steps}>
      <li className={styles.step}>
        <div className={styles.phone} aria-hidden="true">
          <Feed handle="@ana.trades" text="$EXAMPLE just broke out. Thoughts?" chart>
            <div className={styles.rail}>
              <Icon d={HEART} />
              <Icon d={BUBBLE} />
              <span className={styles.shareRing}>
                <Icon d={SHARE} size={22} />
              </span>
            </div>
          </Feed>
        </div>
        <p className={styles.caption}>
          <span className={styles.no}>01</span>See it.
        </p>
      </li>

      <li className={styles.step}>
        <div className={styles.phone} aria-hidden="true">
          <div className={`${styles.screen} ${styles.under}`}>
            <div className={`${styles.sheet} ${styles.shareSheet}`}>
              <div className={styles.grab} />
              <div className={styles.sheetTitle}>Share</div>
              <div className={styles.apps}>
                <div className={styles.app}>
                  <span className={styles.tile}>
                    <Icon d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4A8 8 0 1 1 20 12z" size={20} />
                  </span>
                  Messages
                </div>
                <div className={styles.app}>
                  <span className={styles.tile}>
                    <Icon d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l9 6 9-6" size={20} />
                  </span>
                  Mail
                </div>
                <div className={`${styles.app} ${styles.appSpot}`}>
                  <span className={styles.tileSpot}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/spot-icon.svg" alt="" />
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
          </div>
        </div>
        <p className={styles.caption}>
          <span className={styles.no}>02</span>Share to Spot.
        </p>
      </li>

      <li className={styles.step}>
        <div className={styles.phone} aria-hidden="true">
          <div className={`${styles.screen} ${styles.under}`}>
            <div className={`${styles.sheet} ${styles.buySheet}`}>
              <div className={styles.grab} />
              <div className={styles.buyHead}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/spot-icon.svg" alt="" />
                Buy $EXAMPLE
              </div>
              <div className={styles.amount}>
                25 <span>USDC</span>
              </div>
              <div className={styles.chips}>
                <span>10</span>
                <span className={styles.chipOn}>25</span>
                <span>50</span>
              </div>
              <div className={styles.passed}>
                <Icon d={CHECK} size={16} />
                Four checks passed
              </div>
              <div className={styles.confirm}>
                <Icon d={FACE} size={16} />
                Confirm with Face ID
              </div>
            </div>
          </div>
        </div>
        <p className={styles.caption}>
          <span className={styles.no}>03</span>Confirm.
        </p>
      </li>

      <li className={styles.step}>
        <div className={styles.phone} aria-hidden="true">
          <Feed handle="@dan.cooks" text="Ten-minute ramen, part 3">
            <div className={styles.banner}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/spot-icon.svg" alt="" />
              <div>
                <b>Bought $EXAMPLE</b>
                <br />
                25 USDC, in your Spot balance
              </div>
            </div>
          </Feed>
        </div>
        <p className={styles.caption}>
          <span className={styles.no}>04</span>Keep scrolling.
        </p>
      </li>
    </ol>
  );
}
