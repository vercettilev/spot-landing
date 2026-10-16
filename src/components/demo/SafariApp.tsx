import { Use } from "./marks";
import styles from "./SafariApp.module.css";

/* The pair's numbers, the way the page sets them out: each a small card. */
const STATS = [
  ["Liquidity", "$946.8M"],
  ["FDV", "$62.8B"],
  ["Mkt cap", "$62.8B"],
] as const;

const MOVES = [
  ["5M", "+0.12%", true],
  ["1H", "−0.41%", false],
  ["6H", "−1.92%", false],
  ["24H", "−4.02%", false],
] as const;

/* The latest trades on the pair, newest first. */
const TRADES = [
  ["2s", "Buy", "$412.50", "3.87"],
  ["4s", "Sell", "$1,204", "11.29"],
  ["7s", "Buy", "$88.10", "0.83"],
  ["9s", "Buy", "$2,750", "25.79"],
  ["13s", "Sell", "$316.40", "2.97"],
  ["16s", "Buy", "$45.00", "0.42"],
  ["21s", "Sell", "$9,812", "92.01"],
  ["24s", "Buy", "$150.00", "1.41"],
] as const;

const SolMark = ({ className }: { className: string }) => (
  <svg viewBox="0 0 56 56" className={className} aria-hidden="true">
    <defs>
      <linearGradient id="pd-sf-sol" gradientUnits="userSpaceOnUse" x1="40" y1="300" x2="360" y2="10">
        <stop offset="0" stopColor="#9945FF" />
        <stop offset="1" stopColor="#14F195" />
      </linearGradient>
    </defs>
    <circle cx="28" cy="28" r="28" fill="#000" />
    <g transform="translate(13 16.25) scale(0.0754)" fill="url(#pd-sf-sol)">
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
    </g>
  </svg>
);

/**
 * SAFARI ON AN IPHONE, open on SOL's page on DEX Screener: the pair, its
 * chart, its numbers and the trades coming in, under Safari's toolbar with
 * Share in the middle. A coin's page is a link with the coin in it, so Spot
 * reads it straight from the share (src/engine/links.ts); a news page would
 * need a screenshot, which is why this is not one. Once the buy is done, the
 * page scrolls on down the trades.
 */
export function SafariApp() {
  return (
    <div className={styles.app}>
      <div className={styles.page}>
        <div className={styles.site}>
          <span className={styles.logo}>
            <i />
            DEX SCREENER
          </span>
          <Use name="webSearch" className={styles.siteIcon} />
          <Use name="webMenu" className={styles.siteIcon} />
        </div>

        <div className={styles.pair}>
          <SolMark className={styles.face} />
          <p className={styles.names}>
            <b>SOL</b>
            <span>/ USDC</span>
          </p>
          <span className={styles.chip}>Solana</span>
          <span className={styles.chip}>Raydium</span>
        </div>
        <p className={styles.price}>
          $106.64
          <span>−4.02%</span>
        </p>

        <Use name="chartDex" className={styles.chart} />

        <div className={styles.stats}>
          {STATS.map(([label, value]) => (
            <p key={label} className={styles.stat}>
              <span>{label}</span>
              <b>{value}</b>
            </p>
          ))}
        </div>
        <div className={styles.moves}>
          {MOVES.map(([label, value, up]) => (
            <p key={label} className={styles.stat}>
              <span>{label}</span>
              <b className={up ? styles.up : styles.down}>{value}</b>
            </p>
          ))}
        </div>

        <p className={styles.tabs}>
          <b>Transactions</b>
          <span>Top traders</span>
          <span>Holders</span>
        </p>
        <div className={styles.trades}>
          {TRADES.map(([ago, side, usd, sol]) => (
            <p key={ago} className={styles.trade}>
              <span>{ago}</span>
              <b className={side === "Buy" ? styles.up : styles.down}>{side}</b>
              <span className={styles.usd}>{usd}</span>
              <span className={styles.sol}>{sol}</span>
            </p>
          ))}
        </div>
      </div>

      <i className={styles.top} />
      <div className={styles.bar}>
        <div className={styles.url}>
          <Use name="sfPage" className={styles.urlIcon} />
          <span>dexscreener.com</span>
          <Use name="sfReload" className={styles.urlIcon} />
        </div>
        <div className={styles.tools}>
          <Use name="sfBack" className={styles.tool} />
          <Use name="sfFwd" className={`${styles.tool} ${styles.off}`} />
          <span className={styles.share}>
            <Use name="sfShare" className={styles.tool} />
          </span>
          <Use name="sfBook" className={styles.tool} />
          <Use name="sfTabs" className={styles.tool} />
        </div>
      </div>
    </div>
  );
}
