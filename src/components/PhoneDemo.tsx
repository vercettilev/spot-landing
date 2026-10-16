import { DemoLoop } from "./DemoLoop";
import { HomeBar, Iphone, StatusBar } from "./Iphone";
import { Line, Sprite, X_LOGO } from "./demo/marks";
import { TelegramApp } from "./demo/TelegramApp";
import { TikTokApp } from "./demo/TikTokApp";
import { XApp } from "./demo/XApp";
import styles from "./PhoneDemo.module.css";

/* TikTok's note (Simple Icons, CC0), for its app icon. */
const TIKTOK =
  "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z";

/* ---------- iOS's share sheet: its actions, drawn as line marks ---------- */
const ACT_COPY = "M9 8.4V6a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 20 6v10a1.5 1.5 0 0 1-1.5 1.5H16M5.5 8.5h8A1.5 1.5 0 0 1 15 10v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 18v-8a1.5 1.5 0 0 1 1.5-1.5z";
const ACT_GLASSES = "M3.2 14.2a3.4 3.4 0 1 0 6.8 0 3.4 3.4 0 0 0-6.8 0zM14 14.2a3.4 3.4 0 1 0 6.8 0 3.4 3.4 0 0 0-6.8 0zM10 13.4c1.2-.7 2.8-.7 4 0M3.4 13 5.6 7.2M20.6 13l-2.2-5.8";
const ACT_BOOK = "M12 6.6C10.2 5.3 7.9 4.6 5 4.6v13.2c2.9 0 5.2.7 7 2 1.8-1.3 4.1-2 7-2V4.6c-2.9 0-5.2.7-7 2zM12 6.6v13.2";
const ACT_DOTS = "M6 12h.01M12 12h.01M18 12h.01";

/* ---------- Spot's own marks (mobile/src/components/ui.tsx) ---------- */
const BACK = "M19 12H5M11 18l-6-6 6-6";
const TICK = "M5 12.5l4.5 4.5L19 7.5";
const OUT = "M8 16L16 8M9.5 8H16v6.5";
const DOWN = "M7 10l5 5 5-5";

/* ---------- iOS app icons, 64 points, as iOS 26 draws them ---------- */
type App = "x" | "tiktok" | "telegram" | "airdrop" | "messages" | "mail" | "notes";

function AppIcon({ app, id, className = styles.ai }: { app: App; id: string; className?: string }) {
  let body: React.ReactNode = null;
  if (app === "tiktok") {
    body = (
      <>
        <rect width="64" height="64" fill="#000" />
        <g transform="translate(17.6 15.2) scale(1.2)">
          <path d={TIKTOK} fill="#25F4EE" />
        </g>
        <g transform="translate(19.6 16.8) scale(1.2)">
          <path d={TIKTOK} fill="#FE2C55" />
        </g>
        <g transform="translate(18.6 16) scale(1.2)">
          <path d={TIKTOK} fill="#fff" />
        </g>
      </>
    );
  } else if (app === "telegram") {
    body = (
      <>
        <defs>
          <linearGradient id={`${id}tg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#37BBFE" />
            <stop offset="1" stopColor="#007DBB" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#${id}tg)`} />
        <path
          d="M14.6 30.9 46.4 18.6c1.6-.6 3 .4 2.5 2.9l-5.4 25.4c-.4 1.8-1.5 2.3-3 1.4l-8.3-6.1-4 3.9c-.5.4-.8.8-1.6.8l.6-8.4 15.4-13.9c.7-.6-.1-.9-1-.3L22.5 36.3l-8.1-2.5c-1.8-.6-1.8-1.8.2-2.9z"
          fill="#fff"
        />
      </>
    );
  } else if (app === "x") {
    body = (
      <>
        <rect width="64" height="64" fill="#000" />
        <g transform="translate(15 15) scale(1.42)">
          <path d={X_LOGO} fill="#fff" />
        </g>
      </>
    );
  } else if (app === "airdrop") {
    body = (
      <>
        <defs>
          <linearGradient id={`${id}ad`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#58AEFF" />
            <stop offset="1" stopColor="#0A6CF5" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#${id}ad)`} />
        <circle cx="32" cy="31" r="21" fill="#fff" fillOpacity=".26" />
        <circle cx="32" cy="31" r="13.5" fill="#fff" fillOpacity=".34" />
        <path d="M32 31 18 62h28z" fill="#1d7af6" />
        <circle cx="32" cy="31" r="6" fill="#fff" />
      </>
    );
  } else if (app === "messages") {
    body = (
      <>
        <defs>
          <linearGradient id={`${id}ms`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6CF279" />
            <stop offset="1" stopColor="#1FC13A" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#${id}ms)`} />
        <path
          d="M32 15c-10.6 0-19 6.7-19 15 0 4.9 2.9 9.2 7.4 12-.3 2.6-1.6 5-3.7 6.6 3.5.3 7.1-.9 9.6-3.1 1.8.4 3.7.6 5.7.6 10.6 0 19-6.7 19-15S42.6 15 32 15z"
          fill="#fff"
        />
      </>
    );
  } else if (app === "mail") {
    body = (
      <>
        <defs>
          <linearGradient id={`${id}ml`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5CC9FF" />
            <stop offset="1" stopColor="#1471F5" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" fill={`url(#${id}ml)`} />
        <rect x="12" y="19" width="40" height="27" rx="4.5" fill="#fff" />
        <path d="M13.5 21.5 32 35l18.5-13.5" fill="none" stroke="#5aaef7" strokeWidth="2.4" strokeLinejoin="round" />
      </>
    );
  } else {
    body = (
      <>
        <rect width="64" height="64" fill="#fbfbfb" />
        <rect width="64" height="17" fill="#FFD43B" />
        <path d="M10 33h44M10 45h44" stroke="#c9c9cd" strokeWidth="2" />
      </>
    );
  }
  return (
    <span className={className}>
      <svg viewBox="0 0 64 64">{body}</svg>
    </span>
  );
}

const SpotIcon = () => (
  <span className={`${styles.ai} ${styles.aiSpot}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/spot-icon.svg" alt="" />
  </span>
);

/* ---------- the three apps the loop goes through, in order ---------- */
/* Where the post comes from in each, in the share sheet and in Spot's own
   words (sourceLine in mobile/src/logic.ts). */
const APPS = [
  { app: "x", name: "X", title: "Ana on X: “Buying the $SOL dip”", site: "x.com", from: "from @ana_trades on X" },
  { app: "tiktok", name: "TikTok", title: "nico.charts on TikTok", site: "tiktok.com", from: "from @nico.charts on TikTok" },
  { app: "telegram", name: "Telegram", title: "Mika Onchain", site: "t.me", from: "from @mika_onchain on Telegram" },
] as const;

/* Each app's own class for the parts that change with it: shown for its
   third of the apps' clock (see the module). */
const NTH = [styles.app0, styles.app1, styles.app2];

/* Over Spot, iOS's way back ("◀ X") to the app the loop came from. */
const BACKS = [styles.back0, styles.back1, styles.back2];

/* ---------- the iOS 26 share sheet, opened from the post ---------- */
const PEOPLE = [
  ["AK", "Alex Kim"],
  ["SL", "Sara Lopez"],
  ["TR", "Tom Reed"],
  ["NP", "Nina Park"],
  ["JB", "Jo B."],
] as const;

function ShareSheet({ id }: { id: string }) {
  return (
    <div className={styles.sheet}>
      <div className={styles.heads}>
        {APPS.map((a, i) => (
          <div key={a.app} className={`${styles.sheetHead} ${NTH[i]}`}>
            <span className={styles.thumb}>
              <AppIcon app={a.app} id={`${id}${a.app}`} />
            </span>
            <span className={styles.sheetTitle}>
              <b>{a.title}</b>
              <span>{a.site}</span>
            </span>
          </div>
        ))}
      </div>
      <div className={styles.row}>
        {PEOPLE.map(([initials, name]) => (
          <span key={name} className={styles.item}>
            <span className={styles.person}>
              {initials}
              <span className={styles.badgeMsg}>
                <svg viewBox="0 0 16 16">
                  <path d="M8 3.5c-3 0-5.4 1.9-5.4 4.2 0 1.4.8 2.6 2 3.4-.1.8-.5 1.5-1.1 2 1 .1 2-.3 2.8-.9.5.1 1.1.2 1.7.2 3 0 5.4-1.9 5.4-4.2S11 3.5 8 3.5z" fill="#fff" />
                </svg>
              </span>
            </span>
            <span className={styles.label}>{name}</span>
          </span>
        ))}
      </div>
      <div className={styles.row}>
        <span className={styles.item}>
          <AppIcon app="airdrop" id={id} />
          <span className={styles.label}>AirDrop</span>
        </span>
        <span className={`${styles.item} ${styles.itemSpot}`}>
          <span className={styles.spotTile}>
            <SpotIcon />
          </span>
          <span className={styles.label}>Spot</span>
        </span>
        <span className={styles.item}>
          <AppIcon app="messages" id={id} />
          <span className={styles.label}>Messages</span>
        </span>
        <span className={styles.item}>
          <AppIcon app="mail" id={id} />
          <span className={styles.label}>Mail</span>
        </span>
        <span className={styles.item}>
          <AppIcon app="notes" id={id} />
          <span className={styles.label}>Notes</span>
        </span>
      </div>
      <div className={`${styles.row} ${styles.rowLast}`}>
        {[
          [ACT_COPY, "Copy"],
          [ACT_GLASSES, "Add to Reading List"],
          [ACT_BOOK, "Add Bookmark"],
          [ACT_DOTS, "More"],
        ].map(([d, label]) => (
          <span key={label} className={styles.item}>
            <span className={styles.action}>
              <Line d={d!} className={styles.actionIcon} w={d === ACT_DOTS ? 2.6 : 1.7} />
            </span>
            <span className={styles.label}>{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Spot: the coin screen, in the app's own words ---------- */
/* SOL as /api/resolve and /api/sniff answered on 2026-10-13: the four checks
   every receipt shows, the two clean ones folded under them. */
const CHECKS = [
  ["Honeypot?", "No"],
  ["Dev can freeze it?", "No"],
  ["Dev can print more?", "No"],
  ["Enough holders?", "3.8M"],
] as const;

const SolFace = () => (
  <svg viewBox="0 0 56 56" className={styles.face}>
    <defs>
      <linearGradient id="spot-demo-sol" gradientUnits="userSpaceOnUse" x1="40" y1="300" x2="360" y2="10">
        <stop offset="0" stopColor="#9945FF" />
        <stop offset="1" stopColor="#14F195" />
      </linearGradient>
    </defs>
    <circle cx="28" cy="28" r="27.5" fill="#101014" stroke="rgba(255,255,255,0.12)" />
    <g transform="translate(13 16.25) scale(0.0754)" fill="url(#spot-demo-sol)">
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
    </g>
  </svg>
);

function SpotScreen() {
  return (
    <div className={styles.spot}>
      <div className={styles.spotScroll}>
        <div className={styles.spotTop}>
          <Line d={BACK} className={styles.spotBack} />
          <span className={styles.sources}>
            {APPS.map((a, i) => (
              <span key={a.app} className={`${styles.source} ${NTH[i]}`}>
                {a.from}
              </span>
            ))}
          </span>
        </div>
        <div className={styles.coin}>
          <SolFace />
          <div className={styles.coinText}>
            <p className={styles.symbolRow}>
              <span className={styles.symbol}>$SOL</span>
              <span className={styles.verified}>
                <Line d={TICK} w={3.4} />
              </span>
            </p>
            <p className={styles.coinName}>Wrapped SOL, $62.8B cap</p>
          </div>
          <div className={styles.priceCol}>
            <p className={styles.price}>$106.64</p>
            <p className={styles.change}>−4.0%</p>
          </div>
        </div>
        <div className={styles.caRow}>
          <span className={styles.ca}>
            <b>CA</b>
            <code>So11…1112</code>
            <em>Copy</em>
          </span>
          <span className={styles.ca}>
            <em>Solscan</em>
            <Line d={OUT} className={styles.out} />
          </span>
        </div>

        <div className={styles.paper}>
          <p className={styles.kicker}>
            <span>Sniff report</span>
            <span className={styles.clock}>
              <span className={styles.live}>live</span>
              <span className={styles.at}>09:41</span>
            </span>
          </p>
          <div className={styles.slot}>
            <i className={styles.slotEmpty} />
            <p className={styles.stamp}>CLEAN</p>
          </div>
          <div className={styles.stack}>
            <div className={styles.loading}>
              <div className={styles.verdict}>
                <p className={styles.headline}>Sniffing for scams…</p>
                <p className={styles.verdictLine}>Can you sell it? Can the dev freeze it? A few seconds.</p>
              </div>
              {CHECKS.map(([q]) => (
                <p key={q} className={styles.check}>
                  <span>{q}</span>
                  <i className={styles.pending} />
                </p>
              ))}
            </div>
            <div className={styles.done}>
              <div className={styles.verdict}>
                <p className={styles.headline}>Blue chip. Nothing smells off.</p>
                <p className={styles.verdictLine}>Big, old and verified. You can sell it back anytime.</p>
              </div>
              {CHECKS.map(([q, a], i) => (
                <p key={q} className={styles.check} style={{ "--i": i } as React.CSSProperties}>
                  <span>{q}</span>
                  <span className={styles.answer}>{a}</span>
                </p>
              ))}
              <p className={styles.fold} style={{ "--i": CHECKS.length } as React.CSSProperties}>
                <span>2 more checks, all clear</span>
                <span className={styles.show}>
                  Show
                  <Line d={DOWN} className={styles.chev} w={2.4} />
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.dock}>
        <div className={styles.chips}>
          <span className={styles.pill}>$10</span>
          <span className={`${styles.pill} ${styles.pillOn}`}>$25</span>
          <span className={styles.pill}>$50</span>
          <span className={styles.pill}>Other</span>
        </div>
        <div className={styles.key}>
          <span className={`${styles.keyFace} ${styles.keyWait}`}>Sniffing…</span>
          <span className={`${styles.keyFace} ${styles.keyApe}`}>Ape $25</span>
          <span className={`${styles.keyFace} ${styles.keyAping}`}>Aping…</span>
        </div>
        <p className={styles.note}>
          <span className={styles.noteSniff}>Checking it for scams…</span>
          <span className={styles.noteReady}>$412.50 ready to ape. Your wallet approves every trade.</span>
        </p>
      </div>

      {/* The moment a buy lands (mobile/src/components/Moment.tsx): the
          orange comes up from the key, the dog pops out of it. */}
      <div className={styles.moment}>
        <i className={styles.burst} />
        <div className={styles.momentBody}>
          <div className={styles.momentStage}>
            <i className={`${styles.ring} ${styles.ring1}`} />
            <i className={`${styles.ring} ${styles.ring2}`} />
            <i className={`${styles.ring} ${styles.ring3}`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.momentPup} src="/spot-puppy.svg" alt="" />
          </div>
          <div className={styles.words}>
            <p className={styles.aped}>Aped.</p>
            <p className={styles.got}>$25.00 → 0.234 SOL</p>
            <p className={styles.small}>In your bag. Sniffed for rugs first.</p>
            <p className={styles.momentKeys}>
              <span className={styles.momentShare}>Share</span>
              <span className={styles.momentDone}>Done</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SPOT, DOING ITS ONE THING, on a real phone, from three apps in turn: a
 * post on X, then a TikTok, then a Telegram channel, each time Share, Spot
 * in the share sheet, Spot's sniff report stamped CLEAN, Ape $25, the orange
 * moment, and back to the app. Three taps, each one lit before it lands, so
 * a first-time reader sees where to press. They are three of the four apps
 * Spot reads posts from on its own (src/engine/posts.ts); a Reddit post or a
 * news page would need a screenshot, so they are not here. The coin is SOL,
 * the post and the sniff in the app's own words (example data).
 *
 * Pure CSS: every moving part runs on a 15-second clock per loop and a
 * 45-second one across the apps (see the module). With reduced motion, or
 * before the styles run, it rests on Spot's screen with the Ape key. The
 * screen is a picture; the caption says the steps. Drawn on the server: only
 * the clock's controls (DemoLoop) run in the browser.
 */
export function PhoneDemo() {
  return (
    <DemoLoop
      apps={APPS.map((a) => ({ name: a.name, icon: <AppIcon app={a.app} id={`rail${a.app}`} className={styles.railIcon} /> }))}
    >
      <Iphone>
        <Sprite />
        <XApp />
        <TikTokApp />
        <TelegramApp />
        <i className={styles.veil} />
        <ShareSheet id="pd" />
        <SpotScreen />
        {/* Each tap is lit before it lands: the screen dims around the
            one thing to press, then a finger presses it. Share is in a
            different place in each app. */}
        <i className={`${styles.focus} ${styles.focusX}`} />
        <i className={`${styles.tap} ${styles.tapX}`} />
        <i className={`${styles.focus} ${styles.focusTikTok}`} />
        <i className={`${styles.tap} ${styles.tapTikTok}`} />
        <i className={`${styles.focus} ${styles.focusTelegram}`} />
        <i className={`${styles.tap} ${styles.tapTelegram}`} />
        <i className={`${styles.focus} ${styles.focusSpot}`} />
        <i className={`${styles.tap} ${styles.tap2}`} />
        <i className={`${styles.focus} ${styles.focusKey}`} />
        <i className={`${styles.tap} ${styles.tap3}`} />
        {/* The top of the screen: black over X and Telegram, white over
            TikTok, and over Spot the way back to whichever app sent it. */}
        <StatusBar tone="dark" className={styles.barDark} />
        <StatusBar tone="light" className={styles.barLight} />
        {APPS.map((a, i) => (
          <StatusBar key={a.app} tone="light" back={a.name} className={BACKS[i]} />
        ))}
        <HomeBar tone="dark" className={styles.homeDark} />
        <HomeBar tone="light" className={styles.homeLight} />
      </Iphone>
    </DemoLoop>
  );
}
