import styles from "./EarlyChart.module.css";

/* One example run, in a 600 × 340 box: the CA drops, a slow start, the climb,
   the top, and the slide after it. Made up, and marked as an example. */
const RUN: [number, number][] = [
  [0, 248], [36, 242], [72, 245], [104, 238], [128, 223], [164, 229], [204, 183], [244, 192],
  [284, 133], [324, 141], [364, 85], [404, 95], [444, 46], [474, 24], [504, 36], [534, 68],
  [566, 95], [600, 128],
];
const POST_X = 104;
const YOU = RUN[4]!;
const THEM = RUN[13]!;

/* The run as one-minute candles: each closes on the line, opens where the
   last one closed, with a wick either side. Deterministic, so the server and
   the browser draw the same chart. */
const CANDLES = (() => {
  const at = (x: number) => {
    const i = Math.max(0, RUN.findIndex(([px]) => px >= x) - 1);
    const [x0, y0] = RUN[i]!;
    const [x1, y1] = RUN[Math.min(i + 1, RUN.length - 1)]!;
    return x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  };
  const f = (n: number) => n.toFixed(1);
  const p = { upWick: "", upBody: "", upVol: "", downWick: "", downBody: "", downVol: "" };
  let open = at(0);
  for (let i = 0, x = 6; x <= 594; i++, x += 14) {
    const jitter = (((i * 7919) % 13) - 6) * 1.6;
    const close = Math.min(262, Math.max(16, at(x + 5) + jitter));
    const k = close <= open ? ("up" as const) : ("down" as const);
    const top = Math.min(open, close);
    const body = Math.max(1.6, Math.abs(close - open));
    const wickUp = 3 + ((i * 31) % 5) * 1.6;
    const wickDown = 3 + ((i * 17) % 4) * 1.5;
    /* Volume: a trickle before the CA, a burst when it drops, heavy on the run. */
    const vol = x < POST_X ? 3 + ((i * 13) % 3) : x < 140 ? 22 + ((i * 11) % 6) : x < 480 ? 9 + ((i * 29) % 13) : 7 + ((i * 7) % 8);
    p[`${k}Wick`] += `M${f(x + 4)} ${f(top - wickUp)}V${f(top + body + wickDown)}`;
    p[`${k}Body`] += `M${x} ${f(top)}h8v${f(body)}h-8z`;
    p[`${k}Vol`] += `M${x} ${340 - vol}h8v${vol}h-8z`;
    open = close;
  }
  return p;
})();

/* Places an HTML label over the drawing, in percentages of the same box. */
const at = ([x, y]: [number, number]) => ({ left: `${(x / 600) * 100}%`, top: `${(y / 340) * 100}%` });

/* $NOODLE's face: a bowl of noodles, the way a new coin's picture is a joke. */
const Face = () => (
  <svg className={styles.face} viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="16" fill="#ffd34d" />
    <path d="M12.5 15.5c0-3 1.6-3 1.6-6M16 15.5c0-3 1.6-3 1.6-6M19.5 15.5c0-3 1.6-3 1.6-6" fill="none" stroke="#c98a00" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M7 16h18a9 9 0 0 1-18 0z" fill="#fc4e02" />
    <path d="M21 4.5 15.5 14M24.5 6 17.5 14.5" stroke="#0b0b0c" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/**
 * EARLY, NOT EXIT LIQUIDITY, as a coin's chart: the CA drops, you are in
 * four taps later near the bottom of the run, and the people still copying
 * the CA buy the top. Drawn as the chart a trader would see (one-minute
 * candles, volume under them) in a card that sits in the page's light. The
 * candles are SVG; the dots and labels are HTML on top of it so the type
 * stays sharp and sized like the page at any width.
 */
export function EarlyChart() {
  return (
    <figure
      className={styles.chart}
      role="img"
      aria-label="Example chart. The CA drops, you buy four taps later near the start of the run, and the people still copying the CA buy near the top."
    >
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.card} aria-hidden="true">
        <div className={styles.head}>
          <Face />
          <b>$NOODLE</b>
          <span>/ USD · 1m</span>
          <span className={styles.tag}>Example</span>
        </div>
        <div className={styles.plot}>
          <svg viewBox="0 0 600 340" preserveAspectRatio="none">
            {[60, 130, 200, 270].map((y) => (
              <line key={y} className={styles.grid} x1="0" x2="600" y1={y} y2={y} />
            ))}
            <line className={styles.drop} x1={POST_X} x2={POST_X} y1="0" y2="340" />
            <path d={CANDLES.upVol} className={styles.upVol} />
            <path d={CANDLES.downVol} className={styles.downVol} />
            <path d={CANDLES.upWick} className={styles.upWick} />
            <path d={CANDLES.downWick} className={styles.downWick} />
            <path d={CANDLES.upBody} className={styles.up} />
            <path d={CANDLES.downBody} className={styles.down} />
          </svg>
          <span className={styles.post} style={{ left: `${(POST_X / 600) * 100}%` }}>
            The CA drops
          </span>
          <span className={`${styles.dot} ${styles.you}`} style={at(YOU)}>
            <span className={styles.label}>You, four taps later</span>
          </span>
          <span className={`${styles.dot} ${styles.them}`} style={at(THEM)}>
            <span className={styles.label}>Still copying the CA</span>
          </span>
        </div>
      </div>
    </figure>
  );
}
