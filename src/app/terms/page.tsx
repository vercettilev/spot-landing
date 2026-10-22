import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, OPERATOR } from "@/lib/site";
import styles from "../privacy/privacy.module.css";

export const metadata: Metadata = {
  title: "Terms · Spot",
  description: "The deal, in plain words: what Spot does, what it does not promise, and what is on you.",
  alternates: { canonical: "/terms" },
};

/**
 * THE TERMS, in the same plain words as the app. Spot is a tool that sniffs
 * coins and builds trades you sign yourself; it holds nothing and promises
 * no outcome. The lines a lawyer would want are here in people's words.
 */
export default function Terms() {
  return (
    <main className={styles.page}>
      <p className={styles.back}>
        <Link href="/">← Spot</Link>
      </p>
      <h1>Terms</h1>
      <p className={styles.updated}>Last updated 22 October 2026</p>

      <h2>The deal</h2>
      <p>
        Spot is made by {OPERATOR || "an independent developer"} (&ldquo;we&rdquo;). By using the app or this site you agree
        to these terms. If you do not, do not use Spot.
      </p>

      <h2>What Spot is</h2>
      <p>
        Spot finds the coin in a post you share, runs automated checks on it and shows you the result. If you choose
        to buy or sell, Spot builds the trade through Jupiter, a Solana exchange aggregator, and hands it to your own
        wallet to approve. Spot never holds your coins, your cash or your keys, takes no deposits and cannot move
        anything without your wallet signing it. Spot is a tool, not an exchange, a broker or a bank.
      </p>

      <h2>What Spot does not promise</h2>
      <p>
        The sniff is a set of automated checks on public data. It catches many of the tricks that take people&rsquo;s
        money and it will miss some. &ldquo;Nothing smells off&rdquo; means Spot found no trick it knows; it does
        not mean a coin is safe, honest or going up. Coins can lose all their value, in minutes, with or without a
        trick. Prices, holder counts, pool sizes and every other figure come from other services and can be stale or
        wrong. Nothing in Spot is financial, investment, legal or tax advice. Every trade is your own decision and
        your own risk.
      </p>

      <h2>Your wallet, your responsibility</h2>
      <p>
        You approve each transaction in your wallet and you are responsible for what you approve. Transactions on
        Solana cannot be undone by Spot or anyone else. Keep your wallet, its backup and your phone safe; Spot
        cannot recover a lost wallet or reverse a trade.
      </p>

      <h2>Fees</h2>
      <p>
        Spot charges no fee today. The Solana network charges a small fee per transaction and Jupiter may apply its
        own; your wallet shows them before you approve. If Spot ever adds a fee, the app will show it before you
        trade.
      </p>

      <h2>Tokenized stocks and other issued assets</h2>
      <p>
        Some coins Spot can show, such as tokenized stocks, are issued by third parties under their own terms, and
        the issuer may not sell them to everyone, including people in the United States. Spot shows what it knows
        about such limits and lets you say where you are, but you are responsible for whether you may hold an
        asset where you live.
      </p>

      <h2>Who may use Spot</h2>
      <p>
        You must be 18 or older, able to enter a contract, and allowed to use services like this where you live. Do
        not use Spot if you are on a sanctions list or in a place where its use is prohibited. Do not use Spot to
        break the law, to attack the service or other people, or to automate requests against it.
      </p>

      <h2>The service</h2>
      <p>
        Spot depends on other services (Jupiter, Solana RPC providers, data providers, the platforms posts are
        shared from) and on the Solana network, none of which we control. Spot may be slow, wrong or unavailable,
        and we may change or stop any part of it at any time. We may also refuse to build a trade, for instance
        when the sniff finds a trick, and that is never a promise about the coin.
      </p>

      <h2>No warranty, limited liability</h2>
      <p>
        Spot is provided as is, without warranty of any kind. To the fullest extent the law allows, we are not liable
        for any loss that comes from using Spot, including lost money, lost coins, missed trades, wrong data
        or a wallet you no longer control. Where the law does not allow that, our liability is limited to the
        amount you paid us for Spot, which today is nothing.
      </p>

      <h2>Privacy</h2>
      <p>
        What Spot keeps and what it never sees is in the <Link href="/privacy">privacy notice</Link>.
      </p>

      <h2>Changes and contact</h2>
      <p>
        When these terms change, the date at the top changes with it, and anything that matters gets said in the
        app. They are governed by the laws of the place where we are based.
        {CONTACT_EMAIL ? (
          <>
            {" "}
            Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </>
        ) : null}
      </p>
    </main>
  );
}
