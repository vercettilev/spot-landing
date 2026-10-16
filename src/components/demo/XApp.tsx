import { Use } from "./marks";
import styles from "./XApp.module.css";

/* X ON AN IPHONE, light: the For you feed with Ana's SOL post and its chart,
   the posts around it, the bars and the blue key. */

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

export function XApp() {
  return (
    <div className={styles.app}>
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
