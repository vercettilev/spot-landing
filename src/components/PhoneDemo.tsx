import { DemoLoop } from "./DemoLoop";
import { HomeBar, Iphone, StatusBar } from "./Iphone";
import styles from "./PhoneDemo.module.css";

/* ---------- X, as the app draws it (icons from x.com's own sprite) ---------- */
const X_LOGO = "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z";
const X_REPLY = "M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z";
const X_RT = "M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z";
const X_HEART = "M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z";
const X_VIEWS = "M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z";
const X_BOOKMARK = "M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5zM6.5 4c-.276 0-.5.22-.5.5v14.56l6-4.29 6 4.29V4.5c0-.28-.224-.5-.5-.5h-11z";
const X_SHARE = "M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z";
const X_MORE = "M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z";
const X_VERIFIED = "M12 1.75c1.4 0 2.62.87 3.34 2.19 1.44-.43 2.92-.17 3.91.81s1.24 2.47.81 3.91c1.32.72 2.2 1.94 2.2 3.34s-.88 2.62-2.2 3.34c.43 1.44.18 2.92-.81 3.9-.99 1-2.47 1.25-3.91.82-.72 1.32-1.94 2.19-3.34 2.19s-2.62-.87-3.34-2.2c-1.44.44-2.92.18-3.9-.8-1-.99-1.24-2.47-.82-3.91-1.32-.72-2.19-1.95-2.19-3.34 0-1.4.87-2.62 2.2-3.34-.43-1.44-.18-2.92.8-3.9.99-1 2.47-1.25 3.91-.82.72-1.32 1.95-2.19 3.34-2.19M10.45 13.3l-2.23-2.25-1.42 1.4 3.7 3.75 6.24-6.77-1.47-1.36z";
const X_GROK = "M12.745 20.54l10.97-8.19c.539-.4 1.307-.244 1.564.38 1.349 3.288.746 7.241-1.938 9.955-2.683 2.714-6.417 3.31-9.83 1.954l-3.728 1.745c5.347 3.697 11.84 2.782 15.898-1.324 3.219-3.255 4.216-7.692 3.284-11.693l.008.009c-1.351-5.878.332-8.227 3.782-13.031L33 0l-4.54 4.59v-.014L12.743 20.544m-2.263 1.987c-3.837-3.707-3.175-9.446.1-12.755 2.42-2.449 6.388-3.448 9.852-1.979l3.72-1.737c-.67-.49-1.53-1.017-2.515-1.387-4.455-1.854-9.789-.931-13.41 2.728-3.483 3.523-4.579 8.94-2.697 13.561 1.405 3.454-.899 5.898-3.22 8.364C1.49 30.2.666 31.074 0 32l10.478-9.466";
const X_HOME = "M21.591 7.146L12.52 1.157c-.316-.21-.724-.21-1.04 0l-9.071 5.99c-.26.173-.409.456-.409.757v13.183c0 .502.418.913.929.913h6.638c.511 0 .929-.41.929-.913v-7.075h3.008v7.075c0 .502.418.913.929.913h6.639c.51 0 .928-.41.928-.913V7.904c0-.301-.158-.584-.408-.758z";
const X_SEARCH = "M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z";
const X_BELL = "M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.236l-1.143-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z";
const X_MAIL = "M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z";
const X_PLUS = "M11 11V4h2v7h7v2h-7v7h-2v-7H4v-2h7z";

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

/* X's marks are drawn once, in a sprite at the top of the phone, and used
   by name: the feed repeats them in every post. */
const MARKS = {
  logo: X_LOGO,
  reply: X_REPLY,
  rt: X_RT,
  heart: X_HEART,
  views: X_VIEWS,
  bookmark: X_BOOKMARK,
  share: X_SHARE,
  more: X_MORE,
  verified: X_VERIFIED,
  home: X_HOME,
  search: X_SEARCH,
  bell: X_BELL,
  mail: X_MAIL,
  plus: X_PLUS,
} as const;

type Mark = keyof typeof MARKS | "grok" | "chart";

const Use = ({ name, className }: { name: Mark; className?: string }) => (
  <svg className={className}>
    <use href={`#pd-${name}`} />
  </svg>
);

const Line = ({ d, className, w = 2 }: { d: string; className?: string; w?: number }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/* ---------- the chart in Ana's post: SOL's daily candles, ending on -4.02% ---------- */
const CLOSES = [
  113.8, 115.2, 114.1, 116.6, 117.9, 116.2, 118.4, 119.6, 118.1, 117.2, 118.9, 120.4, 119.1, 117.6, 116.8, 118.2,
  119.8, 121.2, 120.1, 121.9, 120.6, 119.2, 117.8, 116.4, 117.1, 115.2, 113.6, 114.4, 112.1, 111.11, 106.64,
];

const CANDLES = (() => {
  const y = (v: number) => 150 - ((v - 104) / 20) * 120;
  const f = (n: number) => n.toFixed(1);
  const p = { upWick: "", upBody: "", upVol: "", downWick: "", downBody: "", downVol: "" };
  CLOSES.forEach((c, i) => {
    const o = i ? CLOSES[i - 1]! : 112.9;
    const k = c >= o ? ("up" as const) : ("down" as const);
    const x = 10 + i * 9;
    const high = Math.max(o, c) + 0.55 + ((i * 37) % 7) * 0.12;
    const low = Math.min(o, c) - 0.55 - ((i * 53) % 5) * 0.14;
    const top = y(Math.max(o, c));
    const vol = 6 + ((i * 29) % 11) + (i === CLOSES.length - 1 ? 14 : 0);
    p[`${k}Wick`] += `M${f(x + 2.5)} ${f(y(high))}V${f(y(low))}`;
    p[`${k}Body`] += `M${f(x)} ${f(top)}h5v${f(Math.max(1.2, y(Math.min(o, c)) - top))}h-5z`;
    p[`${k}Vol`] += `M${f(x)} ${171 - vol}h5v${vol}h-5z`;
  });
  return { ...p, last: y(106.64), grid: [110, 115, 120].map((v) => [v, y(v)] as const) };
})();

function Sprite() {
  const { last } = CANDLES;
  return (
    <svg className={styles.sprite} aria-hidden="true">
      {Object.entries(MARKS).map(([name, d]) => (
        <symbol key={name} id={`pd-${name}`} viewBox="0 0 24 24">
          <path d={d} fill="currentColor" />
        </symbol>
      ))}
      <symbol id="pd-grok" viewBox="0 0 33 32">
        <path d={X_GROK} fill="currentColor" />
      </symbol>
      <symbol id="pd-chart" viewBox="0 0 318 179">
        <rect width="318" height="179" fill="#131722" />
        {CANDLES.grid.map(([v, gy]) => (
          <g key={v}>
            <line x1="0" x2="284" y1={gy} y2={gy} stroke="#2a2e39" />
            <text x="312" y={gy + 3} textAnchor="end" fontSize="8" fill="#787b86">
              {v}.00
            </text>
          </g>
        ))}
        <path d={CANDLES.upWick} stroke="#26a69a" />
        <path d={CANDLES.downWick} stroke="#ef5350" />
        <path d={CANDLES.upBody} fill="#26a69a" />
        <path d={CANDLES.downBody} fill="#ef5350" />
        <path d={CANDLES.upVol} fill="#26a69a" fillOpacity=".28" />
        <path d={CANDLES.downVol} fill="#ef5350" fillOpacity=".28" />
        <line x1="0" x2="284" y1={last} y2={last} stroke="#ef5350" strokeWidth=".8" strokeDasharray="2 2" />
        <rect x="282" y={last - 7} width="34" height="14" rx="2" fill="#ef5350" />
        <text x="299" y={last + 3.2} textAnchor="middle" fontSize="8.2" fontWeight="600" fill="#fff">
          106.64
        </text>
        <text x="8" y="14" fontSize="9" fontWeight="600" fill="#d1d4dc">
          SOL / U.S. Dollar · 1D
        </text>
        <text x="8" y="25" fontSize="7.6" fill="#787b86">
          O <tspan fill="#ef5350">111.11</tspan>
          <tspan dx="5">H </tspan>
          <tspan fill="#ef5350">111.40</tspan>
          <tspan dx="5">L </tspan>
          <tspan fill="#ef5350">105.97</tspan>
          <tspan dx="5">C </tspan>
          <tspan fill="#ef5350">106.64 −4.02%</tspan>
        </text>
      </symbol>
    </svg>
  );
}

/* ---------- the feed: five posts, twice, so the scroll can loop ---------- */
type Post = {
  key: string;
  av: string;
  name: string;
  verified?: boolean;
  handle: string;
  when: string;
  text: React.ReactNode;
  counts: [string, string, string, string];
  chart?: boolean;
};

const FEED: Post[] = [
  { key: "theo", av: styles.avTheo, name: "Theo", handle: "@theo_dev", when: "1m", text: "the new iPhone camera at night is unreal", counts: ["9", "14", "203", "11K"] },
  {
    key: "ana",
    av: styles.avAna,
    name: "Ana",
    verified: true,
    handle: "@ana_trades",
    when: "2m",
    text: (
      <>
        Buying the <span className={styles.cash}>$SOL</span> dip
      </>
    ),
    counts: ["48", "112", "1.4K", "86K"],
    chart: true,
  },
  { key: "dan", av: styles.avDan, name: "Dan", handle: "@dan_cooks", when: "18m", text: "Ten-minute ramen, part 3", counts: ["3", "9", "57", "2.1K"] },
  { key: "mika", av: styles.avMika, name: "Mika", verified: true, handle: "@mika_onchain", when: "41m", text: "gm. what are we buying today", counts: ["12", "4", "88", "6.7K"] },
  { key: "leo", av: styles.avLeo, name: "Leo", handle: "@leo_builds", when: "1h", text: "shipping day. no meetings, just commits", counts: ["6", "2", "31", "1.9K"] },
];

function XPost({ post, first }: { post: Post; first: boolean }) {
  const lead = first && post.chart;
  return (
    <article className={`${styles.post} ${post.chart ? styles.postTall : ""}`}>
      <span className={`${styles.av} ${post.av}`} />
      <div className={styles.postBody}>
        <div className={styles.postHead}>
          <b>{post.name}</b>
          {post.verified && <Use name="verified" className={styles.badge} />}
          <span className={styles.handle}>
            {post.handle} · {post.when}
          </span>
          <Use name="more" className={styles.more} />
        </div>
        <p className={styles.postText}>{post.text}</p>
        {post.chart && (
          <div className={styles.media}>
            <Use name="chart" className={styles.tv} />
          </div>
        )}
        <div className={styles.acts}>
          {(["reply", "rt", "heart", "views"] as const).map((name, i) => (
            <span key={name} className={styles.act}>
              <Use name={name} className={styles.xi} />
              {post.counts[i]}
            </span>
          ))}
          <span className={styles.actsEnd}>
            <Use name="bookmark" className={styles.xi} />
            <span className={`${styles.share} ${lead ? styles.shareLead : ""}`}>
              <Use name="share" className={styles.xi} />
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}

function XApp() {
  return (
    <div className={styles.xApp}>
      <div className={styles.xList}>
        {[0, 1].flatMap((n) => FEED.map((p) => <XPost key={`${p.key}${n}`} post={p} first={n === 0} />))}
        <XPost post={FEED[0]!} first={false} />
      </div>
      <div className={styles.xTop}>
        <span className={styles.me} />
        <Use name="logo" className={styles.xLogo} />
      </div>
      <div className={styles.xTabs}>
        <span className={`${styles.xTab} ${styles.xTabOn}`}>
          For you
          <i />
        </span>
        <span className={styles.xTab}>Following</span>
        <span className={styles.xTab}>Crypto</span>
        <span className={styles.xTab}>Tech</span>
        <Use name="plus" className={styles.xTabPlus} />
      </div>
      <span className={styles.fab}>
        <Use name="plus" className={styles.fabIcon} />
      </span>
      <div className={styles.xBar}>
        <Use name="home" className={styles.xb} />
        <Use name="search" className={styles.xb} />
        <Use name="grok" className={`${styles.xb} ${styles.xbGrok}`} />
        <Use name="bell" className={styles.xb} />
        <Use name="mail" className={styles.xb} />
      </div>
    </div>
  );
}

/* ---------- iOS app icons, 64 points, as iOS 26 draws them ---------- */
function AppIcon({ app, id }: { app: "x" | "airdrop" | "messages" | "mail" | "notes"; id: string }) {
  let body: React.ReactNode = null;
  if (app === "x") {
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
    <span className={styles.ai}>
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

/* ---------- the iOS 26 share sheet, opened from Ana's post ---------- */
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
      <div className={styles.sheetHead}>
        <span className={styles.thumb}>
          <AppIcon app="x" id={id} />
        </span>
        <span className={styles.sheetTitle}>
          <b>Ana on X: “Buying the $SOL dip”</b>
          <span>x.com</span>
        </span>
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
          <span className={styles.source}>from @ana_trades on X</span>
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
 * SPOT, DOING ITS ONE THING, on a real phone: a post on X, Share, Spot in
 * the share sheet, Spot's sniff report stamped CLEAN, Ape $25, the orange
 * moment, and back to the feed. Three taps, each one lit before it lands, so
 * a first-time reader sees where to press. The coin is SOL, the post and the
 * sniff in the app's own words (example data).
 *
 * Pure CSS: every moving part runs on the same 15-second clock (see the
 * module). With reduced motion, or before the styles run, it rests on Spot's
 * screen with the Ape key. The screen is a picture; the caption says the
 * steps. Drawn on the server: only the clock's controls (DemoLoop) run in
 * the browser.
 */
export function PhoneDemo() {
  return (
    <DemoLoop>
      <Iphone>
        <Sprite />
        <XApp />
        <i className={styles.veil} />
        <ShareSheet id="pd" />
        <SpotScreen />
        {/* Each tap is lit before it lands: the screen dims around the
            one thing to press, then a finger presses it. */}
        <i className={`${styles.focus} ${styles.focusShare}`} />
        <i className={`${styles.tap} ${styles.tap1}`} />
        <i className={`${styles.focus} ${styles.focusSpot}`} />
        <i className={`${styles.tap} ${styles.tap2}`} />
        <i className={`${styles.focus} ${styles.focusKey}`} />
        <i className={`${styles.tap} ${styles.tap3}`} />
        <StatusBar tone="dark" className={styles.barDark} />
        <StatusBar tone="light" back="X" className={styles.barLight} />
        <HomeBar tone="dark" className={styles.barDark} />
        <HomeBar tone="light" className={styles.barLight} />
      </Iphone>
    </DemoLoop>
  );
}
