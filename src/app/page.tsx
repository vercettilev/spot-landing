import Link from "next/link";
import { EarlyChart } from "@/components/EarlyChart";
import { JoinButton } from "@/components/JoinButton";
import { LockScreen } from "@/components/LockScreen";
import { PhoneDemo } from "@/components/PhoneDemo";
import { Reveal } from "@/components/Reveal";
import { Sources } from "@/components/Sources";
import { SpotForm } from "@/components/SpotForm";
import { SpotPuppy } from "@/components/SpotPuppy";
import { getKv, nextPlace } from "@/lib/line";
import { OPERATOR, SITE_URL, X_URL } from "@/lib/site";
import styles from "./page.module.css";

/* THE NUMBER A NEWCOMER WOULD GET, printed under the form as it is: the
   line's own counter, nothing invented. Rendered on the server so it is in
   the first paint and nothing shifts; the page is revalidated every 30
   seconds, so it stays about right without a database read per visit. It is
   withheld while the line is short: a true "#14" says more about the list
   than about Spot. Without Redis (a local run) there is no number. */
export const revalidate = 30;
const SHOW_NEXT_FROM = 100;

async function nextInLine(): Promise<number | null> {
  const kv = getKv();
  if (!kv) return null;
  try {
    const n = await Promise.race([nextPlace(kv), new Promise<null>((done) => setTimeout(() => done(null), 800))]);
    return n !== null && n >= SHOW_NEXT_FROM ? n : null;
  } catch {
    return null;
  }
}

/* One example coin's sniff, in the engine's own words (src/engine/sniff.ts):
   every question asked so that "No" is the good answer. Not a trap, just new
   and small, so the verdict is the warn one: GRRR, and a cap on the ape (the
   engine's cap is at most $50, less for a small pool). */
const SNIFF = [
  { q: "Honeypot?", a: "No", tone: "good" },
  { q: "Dev can freeze it?", a: "No", tone: "good" },
  { q: "Dev can print more?", a: "No", tone: "good" },
  { q: "Enough holders?", a: "Only 38", tone: "warn" },
  { q: "How old?", a: "20 min", tone: "warn" },
] as const;

/* The example coin's picture: a waffle, the way a new coin's picture is a joke. */
const WaffleFace = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="16" fill="#ffcf70" />
    <rect x="6" y="6" width="20" height="20" rx="5" fill="#e39a2d" />
    <path d="M6 12.7h20M6 19.3h20M12.7 6v20M19.3 6v20" stroke="#b86f12" strokeWidth="1.6" />
    <rect x="13" y="13" width="6" height="5" rx="1.2" fill="#fff3b0" />
  </svg>
);

function Mark({ tone }: { tone: (typeof SNIFF)[number]["tone"] }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {tone === "good" ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v9M12 19h.01" />}
    </svg>
  );
}

/**
 * THE PAGE IS ONE TRADE, TOLD AS WHAT IT GETS YOU. The CA drops and you are
 * in early; the dog sniffs out the trap; the coin doubles and your money is
 * back; it was dollars all the way. Each part is one plain sentence under one
 * big line, and one picture that proves it: a chart, the sniff report, a lock
 * screen. Then the same button again, and the small print.
 *
 * Every line is a promise about the first version (see README, "Claims").
 */
export default async function Home() {
  const next = await nextInLine();
  return (
    <div className={styles.page}>
      <header className={`${styles.wrap} ${styles.header}`}>
        <Link href="/" aria-label="Spot home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.wordmark} src="/spot-wordmark-white.svg" alt="" width={76} height={31} />
        </Link>
        <a className={styles.xLink} href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="Follow Spot on X">
          Follow on
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </header>

      <main>
        <section className={`${styles.wrap} ${styles.hero}`}>
          <div>
            {/* The line on the X header and the link card: each sentence keeps its line, the second in orange. */}
            <h1 className={styles.h1}>
              <span className={styles.line}>Spot it.</span>{" "}
              <span className={`${styles.line} ${styles.accent}`}>Buy&nbsp;it.</span>
            </h1>
            <p className={styles.lede}>
              <span className={styles.line}>From your feed to your bag in four&nbsp;taps.</span>{" "}
              <span className={styles.line}>Spot sniffs out the rugs on the&nbsp;way.</span>
            </p>
            <div className={styles.join} id="join">
              <SpotForm shareUrl={SITE_URL} next={next} />
            </div>
          </div>
          <PhoneDemo />
        </section>

        <section className={styles.early} aria-labelledby="early">
          <div className={`${styles.wrap} ${styles.split}`}>
            <div className={styles.copy}>
              <h2 id="early" className={styles.h2}>
                Early, not exit liquidity.
              </h2>
              <p className={styles.body}>
                Copy the CA, open a bot, buy SOL, paste, swap: by then the chart already ran. Spot buys straight from
                the post, in four&nbsp;taps.
              </p>
              <p className={styles.sources}>
                <Sources className={styles.marks} />
                <span>
                  Works from X, TikTok, Telegram, YouTube and coin pages in your browser. Anything else, share
                  a&nbsp;screenshot.
                </span>
              </p>
            </div>
            <div className={styles.visual}>
              <EarlyChart />
            </div>
          </div>
        </section>

        <section className={styles.sniffBand} aria-labelledby="sniff">
          <div className={styles.wrap}>
            <h2 id="sniff" className={`${styles.h2} ${styles.wide}`}>
              Spot smells a rug before you&nbsp;do.
            </h2>
            <div className={styles.proofGrid}>
              <div className={styles.copy}>
                <p className={styles.body}>
                  Every coin gets sniffed before you can ape it. If it&apos;s a trap, like a coin you can&apos;t sell
                  or one the dev can freeze, Spot won&apos;t buy it. If it&apos;s just new and tiny, Spot growls and
                  keeps your ape&nbsp;small.
                </p>
                <p className={styles.aside}>Just curious? Sniff any CA for free, no wallet&nbsp;needed.</p>
              </div>
              <Reveal className={styles.sniff}>
                <div className={styles.sniffPup}>
                  <SpotPuppy mood="angry" label="Spot growling at a risky coin. Press to hear it." />
                </div>
                <div className={styles.report}>
                  <p className={styles.reportHead}>
                    <span>Sniff report</span>
                    <span>Example</span>
                  </p>
                  <p className={styles.reportCoin}>
                    <WaffleFace />
                    $WAFFLE
                  </p>
                  <ul className={styles.rows}>
                    {SNIFF.map((c, i) => (
                      <li key={c.q} style={{ "--i": i } as React.CSSProperties}>
                        <span>{c.q}</span>
                        <span className={`${styles.answer} ${styles[c.tone]}`}>
                          <Mark tone={c.tone} />
                          {c.a}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className={styles.verdict}>Risky. Ape $18&nbsp;max.</p>
                  <p className={styles.grrr}>
                    <span aria-hidden="true">GRRR</span>
                    <span className="sr-only">Spot growls at this one.</span>
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className={styles.after} aria-labelledby="after">
          <div className={styles.wrap}>
            <h2 id="after" className={`${styles.h2} ${styles.wide}`}>
              <span className={styles.line}>Initials out at&nbsp;2x.</span>{" "}
              <span className={styles.line}>The rest&nbsp;rides.</span>
            </h2>
            <div className={styles.proofGrid}>
              <div className={styles.copy}>
                <p className={styles.body}>
                  Flip it on when you ape. When the coin doubles, Spot sells half and your $25 is back. If the dev
                  starts dumping, your phone buzzes before the group chat&nbsp;does.
                </p>
              </div>
              <div className={styles.visual}>
                <LockScreen />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.plain} aria-labelledby="plain">
          <div className={`${styles.wrap} ${styles.plainInner}`}>
            <h2 id="plain" className={styles.h2}>
              Dollars in. Dollars&nbsp;out.
            </h2>
            <p className={styles.body}>
              No SOL to buy first, no gas to top up. Your coins sit in your own wallet, and Spot never holds&nbsp;them.
            </p>
          </div>
        </section>

        <section className={styles.closing} aria-labelledby="closing">
          <div className={`${styles.wrap} ${styles.closingInner}`}>
            <h2 id="closing" className={`${styles.h2} ${styles.big}`}>
              Save your&nbsp;spot.
            </h2>
            <p className={styles.body}>
              Spot lands on Android, iPhone and Solana Seeker. Every friend who joins with your link moves you up
              10&nbsp;spots.
            </p>
            <JoinButton className={styles.cta}>Save my spot</JoinButton>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerInner}`}>
          <p className={styles.small}>
            Spot is coming soon. Tokenized stocks are issued by third parties and aren&apos;t available everywhere,
            including the US. Example data. Not financial advice. {OPERATOR ? `Run by ${OPERATOR.replace(/\.$/, "")}. ` : null}<Link href="/privacy">Privacy</Link>{" "}
            <Link href="/terms">Terms</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
