import Link from "next/link";
import { PhoneSteps } from "@/components/PhoneSteps";
import { SpotFilm } from "@/components/SpotFilm";
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

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={`${styles.wrap} ${styles.header}`}>
        <Link href="/" aria-label="Spot home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.wordmark} src="/spot-wordmark-white.svg" alt="" width={76} height={31} />
        </Link>
        <a className={styles.headerCta} href="#take">
          Take a number
        </a>
      </header>

      <main>
        <section className={`${styles.wrap} ${styles.hero}`}>
          <div className={styles.heroText}>
            <h1 className={styles.h1}>The buy button for every app.</h1>
            <p className={styles.lede}>See it in a feed. Buy it without leaving.</p>
            <SpotFilm />
          </div>
          <div className={styles.formWrap} id="take">
            <div className={styles.puppySlot}>
              <SpotPuppy halo cheer label="Spot the puppy. Press to make it bark." />
            </div>
            <SpotForm shareUrl={SITE_URL} />
          </div>
        </section>

        <section className={styles.how} aria-labelledby="how-title">
          <div className={styles.wrap}>
            <h2 id="how-title" className={`${styles.h2} ${styles.howTitle}`}>
              Inside the app you&apos;re already in.
            </h2>
            <PhoneSteps />
            <p className={styles.example}>Example data.</p>
          </div>
        </section>

        <section className={styles.papers}>
          <div className={`${styles.wrap} ${styles.papersGrid}`}>
            <div className={styles.paperCol}>
              <h2 className={`${styles.h2} ${styles.paperTitle}`}>It sniffs every coin first.</h2>
              <div className={styles.sniff}>
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
              </div>
            </div>

            <div className={`${styles.paperCol} ${styles.receiptCol}`}>
              <h2 className={`${styles.h2} ${styles.paperTitle}`}>No gas. No&nbsp;SOL&nbsp;needed.</h2>
              <div className={styles.receiptWrap}>
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
                      <dt>Network fee</dt>
                      <dd>on Spot</dd>
                    </div>
                    <div>
                      <dt>Spot fee</dt>
                      <dd>shown before you buy</dd>
                    </div>
                    <div>
                      <dt>SOL needed</dt>
                      <dd>0</dd>
                    </div>
                  </dl>
                  <p className={styles.thanks}>Thank you · Woof</p>
                </div>
              </div>
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
