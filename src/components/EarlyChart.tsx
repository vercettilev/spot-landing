import styles from "./EarlyChart.module.css";

/* One example run, in a 600 × 380 box: the CA drops, a slow start, the climb,
   the top, and the slide after it. Made up, and marked as an example. */
const RUN: [number, number][] = [
  [0, 334], [36, 326], [72, 331], [104, 322], [128, 304], [164, 310], [204, 256], [244, 266],
  [284, 196], [324, 206], [364, 138], [404, 150], [444, 92], [474, 66], [504, 80], [534, 118],
  [566, 150], [600, 190],
];
const POST_X = 104;
const YOU = RUN[4];
const THEM = RUN[13];

/* Places an HTML label over the drawing, in percentages of the same box. */
const at = ([x, y]: [number, number]) => ({ left: `${(x / 600) * 100}%`, top: `${(y / 380) * 100}%` });

/**
 * EARLY, NOT EXIT LIQUIDITY, as a chart: the CA drops, you are in three taps
 * later near the bottom of the run, and the people still copying the CA buy
 * the top. The line is SVG; the dots and labels are HTML on top of it so the
 * type stays sharp and sized like the page at any width.
 */
export function EarlyChart() {
  const line = RUN.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  return (
    <figure
      className={styles.chart}
      role="img"
      aria-label="Example chart. The CA drops, you buy three taps later near the start of the run, and the people still copying the CA buy near the top."
    >
      <svg viewBox="0 0 600 380" aria-hidden="true">
        <defs>
          <linearGradient id="early-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fc4e02" stopOpacity="0.32" />
            <stop offset="1" stopColor="#fc4e02" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L600 380 L0 380 Z`} fill="url(#early-fill)" />
        <line className={styles.drop} x1={POST_X} x2={POST_X} y1="20" y2="380" />
        <path className={styles.line} d={line} />
      </svg>

      <span className={styles.post} style={{ left: `${(POST_X / 600) * 100}%` }} aria-hidden="true">
        The CA drops
      </span>
      <span className={`${styles.dot} ${styles.you}`} style={at(YOU)} aria-hidden="true">
        <span className={styles.label}>You, three taps later</span>
      </span>
      <span className={`${styles.dot} ${styles.them}`} style={at(THEM)} aria-hidden="true">
        <span className={styles.label}>Still copying the CA</span>
      </span>
      <span className={styles.tag} aria-hidden="true">
        Example
      </span>
    </figure>
  );
}
