import { Use } from "./marks";
import styles from "./TikTokApp.module.css";

/* The video in nico.charts' post: SOL's last day as a red line, filmed off a
   screen, with the live price at its end. */
const PTS = [
  118.9, 119.6, 118.4, 120.8, 121.9, 120.2, 119.1, 117.6, 118.3, 116.4, 115.1, 115.9, 113.8, 112.6, 113.4, 111.2, 110.4,
  111.1, 109.2, 107.9, 108.6, 106.9, 106.1, 106.64,
];

const RED_LINE = (() => {
  const x = (i: number) => 14 + (i * 318) / (PTS.length - 1);
  const y = (v: number) => 258 - ((v - 104) / 19) * 220;
  const line = PTS.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const end = { x: x(PTS.length - 1), y: y(106.64) };
  return { line, area: `${line} L${end.x.toFixed(1)} 290 L${x(0).toFixed(1)} 290 Z`, end, grid: [106, 110, 114, 118, 122].map(y) };
})();

function RedChart() {
  const { line, area, end, grid } = RED_LINE;
  return (
    <svg className={styles.chart} viewBox="0 0 402 300" aria-hidden="true">
      <defs>
        <linearGradient id="pd-tt-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff3b5c" stopOpacity=".34" />
          <stop offset="1" stopColor="#ff3b5c" stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((gy) => (
        <line key={gy} x1="0" x2="402" y1={gy} y2={gy} stroke="#fff" strokeOpacity=".07" />
      ))}
      <path d={area} fill="url(#pd-tt-fill)" />
      <path d={line} fill="none" stroke="#ff3b5c" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={end.x} cy={end.y} r="6" fill="#ff3b5c" />
      <rect x={end.x - 64} y={end.y + 14} width="70" height="24" rx="6" fill="#ff3b5c" />
      <text x={end.x - 29} y={end.y + 31} textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">
        $106.64
      </text>
    </svg>
  );
}

const Note = () => (
  <svg className={styles.note} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <ellipse cx="6.6" cy="17.6" rx="2.9" ry="2.4" />
    <ellipse cx="17.4" cy="15.4" rx="2.9" ry="2.4" />
    <rect x="8.3" y="5.4" width="1.7" height="12.4" />
    <rect x="19.1" y="3.2" width="1.7" height="12.2" />
    <path d="M8.3 5.4 20.8 2.6v3.1L8.3 8.5z" />
  </svg>
);

type Clip = {
  user: string;
  text: React.ReactNode;
  counts: [string, string, string, string];
  face: string;
  lead?: boolean;
};

/* The rail down the right of a video: who posted it, then like, comment,
   save and share, then the sound's disc. */
function Rail({ clip }: { clip: Clip }) {
  return (
    <div className={styles.rail}>
      <span className={styles.avatar}>
        <i className={clip.face} />
        <b>+</b>
      </span>
      <span className={styles.act}>
        <Use name="ttHeart" className={styles.icon} />
        {clip.counts[0]}
      </span>
      <span className={styles.act}>
        <span className={styles.comment}>
          <Use name="ttComment" className={styles.icon} />
          <i />
        </span>
        {clip.counts[1]}
      </span>
      <span className={styles.act}>
        <Use name="ttBookmark" className={`${styles.icon} ${styles.save}`} />
        {clip.counts[2]}
      </span>
      <span className={`${styles.act} ${clip.lead ? styles.shareLead : ""}`}>
        <Use name="ttShare" className={styles.icon} />
        {clip.counts[3]}
      </span>
      <span className={styles.disc}>
        <i className={clip.face} />
      </span>
    </div>
  );
}

function Caption({ clip }: { clip: Clip }) {
  return (
    <div className={styles.cap}>
      <p className={styles.user}>{clip.user}</p>
      <p className={styles.text}>{clip.text}</p>
      <p className={styles.sound}>
        <Note />
        <span>original sound - {clip.user}</span>
      </p>
    </div>
  );
}

const NICO: Clip = {
  user: "nico.charts",
  text: (
    <>
      $SOL under $110 again. buying the dip, not the top <b>#solana</b> <b>#crypto</b>
    </>
  ),
  counts: ["48.2K", "1,204", "6,410", "2,317"],
  face: styles.faceNico,
  lead: true,
};

const DAN: Clip = {
  user: "dan.cooks",
  text: (
    <>
      ten-minute ramen, part 3 <b>#cooking</b> <b>#ramen</b>
    </>
  ),
  counts: ["91.7K", "2,086", "14.3K", "5,902"],
  face: styles.faceDan,
};

/**
 * TIKTOK ON AN IPHONE: For You, nico.charts filming SOL's red day, the rail
 * with Share on it, and under it the next video, Dan's ramen, which a swipe
 * brings up once the buy is done.
 */
export function TikTokApp() {
  return (
    <div className={styles.app}>
      <div className={styles.pages}>
        <div className={`${styles.page} ${styles.pageNico}`}>
          <div className={styles.glow} />
          <p className={styles.overlay}>
            <span>me buying the</span>
            <span>$SOL dip 📉</span>
          </p>
          <div className={styles.chartWrap}>
            <RedChart />
          </div>
          <Rail clip={NICO} />
          <Caption clip={NICO} />
        </div>
        <div className={`${styles.page} ${styles.pageDan}`}>
          <div className={styles.steam} />
          <p className={styles.overlay}>
            <span>ten-minute ramen 🍜</span>
          </p>
          <Rail clip={DAN} />
          <Caption clip={DAN} />
        </div>
      </div>
      <div className={styles.top}>
        <span className={styles.live}>
          <svg viewBox="0 0 30 26" aria-hidden="true">
            <rect x="2" y="6" width="26" height="18" rx="4.5" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="M10.5 1.8 15 5.6l4.5-3.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <text x="15" y="18.6" textAnchor="middle" fontSize="7.6" fontWeight="800" fill="#fff">
              LIVE
            </text>
          </svg>
        </span>
        <span className={styles.tabs}>
          <span className={styles.tab}>
            Following
            <i className={styles.dot} />
          </span>
          <span className={`${styles.tab} ${styles.tabOn}`}>
            For You
            <i className={styles.underline} />
          </span>
        </span>
        <Use name="ttSearch" className={styles.search} />
      </div>
      <div className={styles.bar}>
        <span className={`${styles.nav} ${styles.navOn}`}>
          <Use name="ttHome" className={styles.navIcon} />
          <b>Home</b>
        </span>
        <span className={styles.nav}>
          <Use name="ttFriends" className={styles.navIcon} />
          <b>Friends</b>
        </span>
        <span className={styles.plus}>
          <i className={styles.plusCyan} />
          <i className={styles.plusRed} />
          <i className={styles.plusWhite}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 6.5v11M6.5 12h11" stroke="#000" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </i>
        </span>
        <span className={styles.nav}>
          <Use name="ttInbox" className={styles.navIcon} />
          <b>Inbox</b>
        </span>
        <span className={styles.nav}>
          <Use name="ttProfile" className={styles.navIcon} />
          <b>Profile</b>
        </span>
      </div>
    </div>
  );
}
