import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, OPERATOR } from "@/lib/site";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy · Spot",
  description: "What the Spot app and this site keep about you, and what they never see.",
  alternates: { canonical: "/privacy" },
};

/**
 * THE PRIVACY NOTICE, for the app and for this site. It describes what the
 * code does, in the order a person would ask: what stays on the phone, what
 * leaves it, who else sees it, and how to make it all go away.
 */
export default function Privacy() {
  const contact = CONTACT_EMAIL ? (
    <>
      {" "}
      Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
    </>
  ) : null;
  return (
    <main className={styles.page}>
      <p className={styles.back}>
        <Link href="/">← Spot</Link>
      </p>
      <h1>Privacy</h1>
      <p className={styles.updated}>Last updated 12 October 2026</p>

      <h2>Who we are</h2>
      <p>Spot, the app and this site, is run by {OPERATOR}.</p>

      <h2>The app: no account, nothing on our side</h2>
      <p>
        Spot has no accounts. You never give it a name, an email or a password. Everything it remembers lives on your
        phone and nowhere else: your settings, the coins you sniffed, the coins you watch, what you did in the app,
        the trades you made through it, and the public address of the wallet you connected. Delete the app and all
        of it is gone. &ldquo;Disconnect&rdquo; in Me forgets the wallet on its own.
      </p>
      <p>
        Your keys never leave your wallet app. Spot asks your wallet to sign each trade and never sees the key that
        does it. Spot cannot move your coins on its own.
      </p>

      <h2>What leaves your phone</h2>
      <p>
        To do its job the app asks our servers a few questions, and each one carries only what it needs:
      </p>
      <p>
        The link or text you share, so we can find the coin in it. The coin&rsquo;s address, so we can sniff it.
        Your wallet&rsquo;s public address, so we can show you your bag and build a trade made out to you. The
        transaction your wallet signed, so it can be sent to the network. A public address is public on Solana
        already; sending it to us tells us nothing the chain does not.
      </p>
      <p>
        We keep none of this in a database. We do count how much Spot is used: how many posts were resolved, coins
        sniffed and what they got, orders built, trades landed and bags read each day, and how many different
        wallets that was, kept as one-way hashes of their addresses that cannot be turned back into one; the counts
        are deleted after 90 days and say nothing about who. Our hosting provider (Vercel) keeps request logs for a
        short time, as every host does, which include your network address and what was asked; we use them to find
        faults. The app has no analytics or advertising code in it.
      </p>

      <h2>Who else sees it</h2>
      <p>
        To answer, our servers ask other services, and those see the coin or the address in question: Jupiter
        (prices, coin records, quotes and the swap itself), Helius (reading the Solana blockchain), Dexscreener
        (trading pairs), and, when you share a post, the public endpoints of X, TikTok, YouTube or Telegram that
        return the post&rsquo;s text. A link to Solscan opens in your browser, under its own notice. Each of these
        has its own privacy policy and sees our server, not your phone.
      </p>

      <h2>This site: the early-access list</h2>
      <p>
        When you ask for early access we keep your email address, the time you signed up and, when we know it, your
        phone (iPhone, Android or Solana Seeker). You get a place in line and a personal link with a code in it;
        when someone joins through your link we note that it was yours. To keep automated sign-ups out, the form
        runs a bot check (Vercel BotID). To stop one person moving themselves up with made-up addresses, we count
        referrals per network for a day using a one-way hash of its IP address, deleted after 24 hours. We count
        visits with Vercel Web Analytics, which reports traffic in aggregate and uses no cookies. Your browser
        remembers your code in local storage so the page can show your place; &ldquo;Not you?&rdquo; makes it
        forget.
      </p>
      <p>
        We use the list to tell you when Spot is ready for your phone and to let people in in order. We do not
        sell addresses or share them for anyone&rsquo;s marketing. Addresses are kept in private storage at Vercel;
        places and codes in a database at Upstash that holds only a one-way hash of each address. We keep them until
        Spot has reached your phone and we have told you, or until you ask us to remove yours.
      </p>

      <h2>Children</h2>
      <p>Spot is for adults. Do not use it, or join the list, if you are under 18.</p>

      <h2>Your choices</h2>
      <p>
        On the phone, you are in charge: disconnect the wallet, clear the app&rsquo;s data, or delete it. For the
        list, you can ask us to show, correct or delete what we hold about you.{contact}
      </p>

      <h2>Changes</h2>
      <p>When this notice changes, the date at the top changes with it, and anything that matters gets said in the app.</p>
    </main>
  );
}
