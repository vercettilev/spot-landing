import Link from "next/link";
import { PhoneDemo } from "@/components/PhoneDemo";
import { Reveal } from "@/components/Reveal";
import { SpotForm } from "@/components/SpotForm";
import { SpotPuppy } from "@/components/SpotPuppy";
import { OPERATOR, SITE_URL } from "@/lib/site";
import styles from "./page.module.css";

/* Only the checks the engine actually runs. Top-holder share is NOT one of
   them (it was dropped because it blocked healthy tokens), so it is not
   promised here or in the film. The answers are one example coin's, a coin
   that fails, because that is the one Spot growls at. */
const SNIFF = [
  { q: "Can you sell it?", a: "Yes", tone: "good" },
  { q: "Can the creator print more?", a: "Yes", tone: "bad" },
  { q: "Can it be frozen?", a: "No", tone: "good" },
  { q: "Is anyone holding it?", a: "Barely", tone: "warn" },
] as const;

function Mark({ tone }: { tone: (typeof SNIFF)[number]["tone"] }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {tone === "good" ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : tone === "bad" ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M12 5v9M12 19h.01" />}
    </svg>
  );
}

/* A lock-screen notification, drawn: what Spot says once the coin is yours. */
function Notice({ title, text, action }: { title: string; text: string; action?: string }) {
  return (
    <div className={styles.noticeCard}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/spot-icon.svg" alt="" width={38} height={36} />
      <div>
        <p className={styles.noticeTop}>
          <span>Spot</span>
          <span>now</span>
        </p>
        <p className={styles.noticeText}>
          <b>{title}</b> {text}
        </p>
      </div>
      {action && (
        <span className={styles.noticeAction} aria-hidden="true">
          {action}
        </span>
      )}
    </div>
  );
}

/**
 * THE WHOLE PAGE, IN TWO GROUNDS AND A FOOTER. Black: what Spot is, the one
 * field, and Spot doing its thing on a phone. Orange: what it does before you
 * buy and after, as paper and notifications. Black again: the small print.
 *
 * Everything here is a promise about the first version: the sniff report's
 * checks, the alert when a coin turns, the optional take profit, no gas.
 */
export default function Home() {
  return (
    <div className={styles.page}>
      <header className={`${styles.wrap} ${styles.header}`}>
        <Link href="/" aria-label="Spot home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.wordmark} src="/spot-wordmark-white.svg" alt="" width={76} height={31} />
        </Link>
      </header>

      <main>
        <section className={`${styles.wrap} ${styles.hero}`}>
          <div>
            <h1 className={styles.h1}>The buy button for every app.</h1>
            <p className={styles.lede}>See it in any feed. Buy&nbsp;or&nbsp;sell it without leaving.</p>
            <div className={styles.join}>
              <SpotForm shareUrl={SITE_URL} />
            </div>
          </div>
          <PhoneDemo />
        </section>

        <section className={styles.trust}>
          <div className={`${styles.wrap} ${styles.trustGrid}`}>
            <div className={styles.col}>
              <h2 className={styles.h2}>Sniffs before you buy. Keeps watching&nbsp;after.</h2>
              <Reveal className={styles.sniff}>
                <div className={styles.sniffPup}>
                  <SpotPuppy mood="angry" label="Spot growling at a scam coin. Press to hear it." />
                </div>
                <div className={styles.report}>
                  <p className={styles.reportHead}>
                    <span>Sniff report</span>
                    <span>Example</span>
                  </p>
                  <p className={styles.reportCoin}>$EXAMPLE</p>
                  <ul className={styles.rows}>
                    {SNIFF.map((c) => (
                      <li key={c.q}>
                        <span>{c.q}</span>
                        <span className={`${styles.answer} ${styles[c.tone]}`}>
                          <Mark tone={c.tone} />
                          {c.a}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className={styles.grrr}>
                    <span aria-hidden="true">GRRR</span>
                    <span className={styles.sr}>Spot growls at this one.</span>
                  </p>
                </div>
              </Reveal>
              <Reveal className={styles.notice}>
                <Notice title="GRRR." text="The creator just sold 40% of $EXAMPLE. Sell?" action="Sell" />
              </Reveal>
              <p className={styles.curious}>Just curious? Share it for a sniff. No wallet needed.</p>
            </div>

            <div className={styles.col}>
              <h2 className={styles.h2}>No gas. No&nbsp;SOL. Just&nbsp;dollars.</h2>
              <Reveal className={styles.receiptWrap}>
                <div className={styles.receipt}>
                  <div className={styles.receiptTop}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/spot-wordmark-black.svg" alt="Spot" width={84} height={34} />
                    <p className={styles.receiptKind}>Buy · Example</p>
                  </div>
                  <dl className={styles.receiptRows}>
                    <div>
                      <dt>$EXAMPLE</dt>
                      <dd>25.00 USDC</dd>
                    </div>
                    <div>
                      <dt>Gas</dt>
                      <dd>on us</dd>
                    </div>
                    <div>
                      <dt>SOL needed</dt>
                      <dd>0</dd>
                    </div>
                    <div>
                      <dt>Spot fee</dt>
                      <dd>shown before you buy</dd>
                    </div>
                    <div>
                      <dt>Take profit</dt>
                      <dd>half at 2×</dd>
                    </div>
                  </dl>
                  <p className={styles.thanks}>Thank you · Woof</p>
                </div>
              </Reveal>
              <Reveal className={`${styles.notice} ${styles.noticeOver}`}>
                <Notice title="$EXAMPLE doubled." text="Sold half, so your $25 is back." />
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerInner}`}>
          <div className={styles.serving} aria-hidden="true">
            <span>Now serving</span>
            <b>000</b>
          </div>
          <p className={styles.small}>
            Spot is coming soon. Tokenized stocks are issued by third parties and aren&apos;t available everywhere,
            including the US. Example data. Not financial advice. Run by {OPERATOR} <Link href="/privacy">Privacy</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
