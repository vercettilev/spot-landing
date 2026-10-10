import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, OPERATOR } from "@/lib/site";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy · Spot",
  description: "What the Spot early-access list collects and why.",
  alternates: { canonical: "/privacy" },
};

/**
 * THE PRIVACY NOTICE FOR THIS SITE ONLY: an early-access list, nothing else.
 * It describes what the code does. When the app ships it needs its own notice.
 */
export default function Privacy() {
  return (
    <main className={styles.page}>
      <p className={styles.back}>
        <Link href="/">← Spot</Link>
      </p>
      <h1>Privacy</h1>
      <p className={styles.updated}>Last updated 10 October 2026</p>

      <h2>Who we are</h2>
      <p>This site is run by {OPERATOR}, which makes Spot.</p>

      <h2>What we collect</h2>
      <p>
        When you ask for early access we keep your email address, the phone you picked (iPhone, Android or Solana
        Seeker) and the time you signed up. That is all the form takes.
      </p>
      <p>
        You also get a place in line and a personal link with a code in it. When someone joins through your link we
        note that it was yours, because that is what moves you up the line.
      </p>
      <p>
        To keep automated sign-ups out, the form runs a bot check (Vercel BotID) that looks at the browser making the
        request. To stop one person moving themselves up with made-up addresses, we count how many referrals each
        network gives in a day, using a one-way hash of its IP address; that count is deleted after 24 hours. We count
        visits with Vercel Web Analytics, which reports pages and traffic in aggregate and does not use cookies.
      </p>
      <p>
        Once you have joined, this browser remembers your code in its local storage (not a cookie), so the page can
        show your place when you come back. &ldquo;Not you?&rdquo; on that screen makes it forget.
      </p>

      <h2>What we use it for</h2>
      <p>
        To email you when Spot is ready for your phone, to decide which phone gets Spot first, and to let people in
        in the order of the line. We do not sell your address or share it with anyone for their own marketing.
      </p>

      <h2>Where it is kept</h2>
      <p>
        In a private storage service run by Vercel, our hosting provider. Your address is not in any file name or
        public link. Places in line and referral codes are kept in a database run by Upstash, connected through
        Vercel; it holds no addresses, only a one-way hash of each.
      </p>

      <h2>How long</h2>
      <p>Until Spot launches on your phone and we have told you, or until you ask us to remove it, whichever comes first.</p>

      <h2>Your choices</h2>
      <p>
        You can ask us to show you what we hold about you, correct it or delete it
        {CONTACT_EMAIL ? (
          <>
            {" "}
            by writing to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </>
        ) : null}
        .
      </p>
    </main>
  );
}
