import Link from "next/link";
import { SpotForm } from "@/components/SpotForm";
import { SpotPuppy } from "@/components/SpotPuppy";
import { SpotVideo } from "@/components/SpotVideo";
import { SITE_URL } from "@/lib/site";
import styles from "./page.module.css";

const APPS = ["TikTok", "X", "Reddit", "YouTube", "Instagram", "Telegram", "Discord", "Safari"];

/* Only the checks the engine actually runs. Top-holder share is NOT one of
   them (it was dropped because it blocked healthy tokens), so it is not
   promised here or in the film. */
const CHECKS = [
  { q: "Can you sell it?", a: "Spot tries the sell route before you buy." },
  { q: "Can the creator print more?", a: "A live mint authority means your share can be watered down." },
  { q: "Can your coins be frozen?", a: "A live freeze authority means your balance can be locked." },
  { q: "Is anyone actually holding it?", a: "Too few holders is a warning, not a launch." },
];

function Lockup() {
  return (
    <span className={styles.lockup}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/spot-icon.svg" alt="" width={36} height={34} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/spot-wordmark-white.svg" alt="Spot" width={64} height={26} />
    </span>
  );
}

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={`${styles.wrap} ${styles.header}`}>
        <Link href="/" aria-label="Spot home">
          <Lockup />
        </Link>
        <a className={styles.headerCta} href="#get">
          Get early access
        </a>
      </header>

      <main>
        <section className={`${styles.wrap} ${styles.hero}`}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>Coming soon · iPhone · Android · Seeker</p>
            <h1 className={styles.h1}>
              The buy button for <em>every app.</em>
            </h1>
            <p className={styles.lede}>
              Saw a stock or a coin on TikTok, Reddit or X? Buy it on the spot. Share the post, tap Spot, confirm, and you
              never leave the app you were in.
            </p>
          </div>
          <div className={styles.formWrap} id="get">
            <div className={styles.puppySlot}>
              <SpotPuppy halo cheer label="Spot the puppy. Press to make it bark." />
            </div>
            <SpotForm shareUrl={SITE_URL} />
          </div>
        </section>

        <section className={styles.film} aria-labelledby="film-title">
          <div className={styles.wrap}>
            <h2 id="film-title" className={styles.filmTitle}>
              See it in 23 seconds.
            </h2>
            <SpotVideo note={<p className={styles.filmNote}>Example data. Sound on: it barks.</p>} />
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.section}`} aria-labelledby="how-title">
          <p className={styles.eyebrow}>How it works</p>
          <h2 id="how-title" className={styles.h2}>
            Three steps. No new tab.
          </h2>
          <ol className={styles.steps}>
            <li className={styles.step}>
              <span className={styles.stepNo}>1</span>
              <h3 className={styles.h3}>Share</h3>
              <p>Tap Share on the post you are looking at, in whatever app it is in.</p>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNo}>2</span>
              <h3 className={styles.h3}>Tap Spot</h3>
              <p>Spot reads the post and finds the stock or coin it is about, with the live price.</p>
            </li>
            <li className={styles.step}>
              <span className={styles.stepNo}>3</span>
              <h3 className={styles.h3}>Confirm</h3>
              <p>Pick an amount and confirm with Face ID or your fingerprint. You pay in USDC, with no gas fees.</p>
            </li>
          </ol>
        </section>

        <section className={`${styles.wrap} ${styles.section}`} aria-labelledby="apps-title">
          <h2 id="apps-title" className={styles.h2}>
            Works wherever there&apos;s a Share button.
          </h2>
          <ul className={styles.apps}>
            {APPS.map((a) => (
              <li key={a} className={styles.app}>
                {a}
              </li>
            ))}
            <li className={`${styles.app} ${styles.appMore}`}>and the rest</li>
          </ul>
        </section>

        <section className={styles.scam} aria-labelledby="scam-title">
          <div className={`${styles.wrap} ${styles.scamGrid}`}>
            <div className={styles.scamDog}>
              <SpotPuppy mood="angry" halo label="Spot growling at a scam coin. Press to hear it." />
            </div>
            <div>
              <p className={`${styles.eyebrow} ${styles.eyebrowRed}`}>Safety check</p>
              <h2 id="scam-title" className={styles.h2}>
                Spot sniffs out <span className={styles.red}>scams.</span>
              </h2>
              <p className={styles.sectionLede}>Before you buy a coin, Spot checks it. If it fails, Spot growls before you pay.</p>
              <ul className={styles.checks}>
                {CHECKS.map((c) => (
                  <li key={c.q} className={styles.check}>
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="11" fill="#ff4d3d" />
                      <path d="M8 8l8 8M16 8l-8 8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
                    </svg>
                    <span>
                      <b>{c.q}</b> {c.a}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.section}`} aria-labelledby="what-title">
          <h2 id="what-title" className={styles.h2}>
            Stocks and crypto, one balance.
          </h2>
          <div className={styles.facts}>
            <div className={styles.fact}>
              <h3 className={styles.h3}>Stocks and coins</h3>
              <p>Tokenized stocks like Tesla and Nvidia, and coins on Solana, in one place.</p>
            </div>
            <div className={styles.fact}>
              <h3 className={styles.h3}>Paid in USDC</h3>
              <p>One dollar balance for everything you buy. No order forms.</p>
            </div>
            <div className={styles.fact}>
              <h3 className={styles.h3}>No gas fees</h3>
              <p>Solana network fees are on us. You never need SOL to buy.</p>
            </div>
          </div>
        </section>

        <section className={`${styles.wrap} ${styles.final}`}>
          <h2 className={styles.finalTitle}>Be first when Spot lands on your phone.</h2>
          <a className={styles.finalCta} href="#get">
            Get early access
          </a>
        </section>
      </main>

      <footer className={`${styles.wrap} ${styles.footer}`}>
        <Lockup />
        <p>
          Spot is coming soon and is not available yet. Tokenized stocks are issued by third parties and are not available
          everywhere, including the US. The film uses example data. App names belong to their owners and appear only to
          describe where Spot works. Nothing on this site is financial advice.
        </p>
        <nav className={styles.footerNav}>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
}
