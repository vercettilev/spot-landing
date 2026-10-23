import { curatedByMint } from "@/core/catalog/index";
import type { UltraSearchClient } from "@/core/resolve/ultra";
import { USDC_MINT } from "@/core/route/jupiter";
import { isEstablished, type EstablishedBar, type OpenMintThresholds } from "@/core/safety/open-mint-gate";
import { TOKEN_PROGRAM } from "./address";
import type { MintFacts, MintFailure, MintReader } from "./chain";
import { num, type Outcome } from "./http";
import { ultraAuthority, type Quote, type QuoteFailure, type Quoter, type TokenInfo } from "./jupiter";
import { cardOf, issuedAsset, type TokenCard } from "./token";

/**
 * THE SNIFF: what Spot says about a coin before anyone apes it.
 *
 * Fresh coins are warned, not blocked. Spot refuses only what can take the
 * bag away: no way to sell it back (or a way that hands back less than
 * half), a live freeze or pause key, a permanent delegate, a token that
 * cannot move. Everything that is only small or new (thin liquidity, few
 * holders, a pool hours old, a dev who can still mint) gets a GRRR, an
 * extra confirm in the app and a size cap. And when a check that could
 * block did not get an answer, the buy waits for one: "we could not check"
 * never reads as "it passed".
 *
 * spot-core's gate refused on size too and skipped the exit probe for any
 * coin that had already failed; here the probe runs for every coin that
 * could be new, because it is the one check that asks whether the exit
 * exists instead of inferring it. A blue chip (in the catalog, or verified,
 * big and old by Jupiter's record) skips it: nobody needs a test trade of
 * BTC, and Jupiter's quotes are the scarce thing on the free plan. Its
 * keys are still read from the chain.
 */

export type Status = "good" | "info" | "warn" | "bad" | "unknown";
export type Level = "ok" | "warn" | "block" | "unknown";
export type CheckId =
  | "route"
  | "honeypot"
  | "freeze"
  | "delegate"
  | "mint"
  | "tax"
  | "hook"
  | "liquidity"
  | "holders"
  | "age"
  | "flagged";

export interface Check {
  id: CheckId;
  /** The question, as the app asks it. */
  label: string;
  /** The answer on the chip. */
  answer: string;
  status: Status;
  /** This check alone stops the buy (when bad), or holds it (when unknown). */
  blocks: boolean;
  /** What the answer means for the bag, when it means something. */
  note: string | null;
  observed: string | number | boolean | null;
  threshold: string | number | null;
}

export interface Sniff {
  mint: string;
  /** ok: buy. warn: GRRR, confirm twice, capped. block: no. unknown: not yet, try again. */
  level: Level;
  headline: string;
  token: TokenCard;
  checks: Check[];
  /** null: no cap. 0: not buyable now. Otherwise the most one buy can be, in USDC. */
  maxBuyUsdc: number | null;
  /** Buy, then sell straight back, both as quoted right now. */
  roundTrip: { inUsdc: number; outUsdc: number; lossPct: number } | null;
  checkedAt: string;
}

export interface Policy {
  thresholds: OpenMintThresholds;
  /** The most a warned coin can be bought for, before liquidity lowers it. */
  warnCapUsdc: number;
  /** A round trip that loses this share or more is a honeypot in all but name. */
  honeypotLoss: number;
  /** One that loses this much is a thin exit, worth a growl. */
  thinExitLoss: number;
}

/**
 * WHAT CLEAN ASKS OF A COIN'S SIZE. spot-core's floors ($7.5k of
 * liquidity, 150 holders, a pool two hours old) were widened to answer
 * whether a coin may be shown at all; here they decide CLEAN or GRRR, and
 * a $34k coin with a $17k pool came out CLEAN (Bonnie, 2026-10-23), which
 * nobody on CT would call it. These sit inside the gap spot-core measured
 * between fresh coins (at most $4.9k, 120 holders, hours old) and
 * established ones (at least $80k, 931 holders, 54 h). Below any of them
 * is a GRRR with its cap, never a block. SPOT_GATE_* overrides them.
 */
export const CLEAN_FLOORS: OpenMintThresholds = {
  minLiquidityUsd: 50_000,
  minHolderCount: 1_000,
  minPoolAgeMs: 24 * 60 * 60 * 1000,
};

export const DEFAULT_POLICY: Policy = {
  thresholds: CLEAN_FLOORS,
  warnCapUsdc: 50,
  honeypotLoss: 0.5,
  thinExitLoss: 0.15,
};

/** Everything the verdict is made from, gathered before any of it is judged. */
export interface Facts {
  info: TokenInfo;
  chain: Outcome<MintFacts, MintFailure>;
  /** Null when no buy was quoted: a blue chip. */
  buy: Outcome<Quote, QuoteFailure> | null;
  /** Null when there was no buy quote to sell back, or no need to. */
  sell: Outcome<Quote, QuoteFailure> | null;
  /** In the catalog, or verified, big and old: no test trade needed. */
  blueChip: boolean;
  amountUsdc: number;
  now: number;
}

const pct = (share: number) => {
  const p = share * 100;
  return `${p < 10 ? Math.round(p * 10) / 10 : Math.round(p)}%`;
};

const usd = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}k` : `$${Math.round(n)}`;

const count = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(Math.round(n));

export function age(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${Math.max(min, 0)} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h`;
  const d = Math.floor(h / 24);
  return d < 730 ? `${d} days` : `${Math.floor(d / 365)} yrs`;
}

/* Every question is asked so that "No" is the good answer, and every note
   says what it means for the bag in words a first-time ape follows. */
const BLOCK_HEADLINE: Partial<Record<CheckId, string>> = {
  route: "Can't buy this one right now.",
  honeypot: "Honeypot. Spot won't buy it.",
  freeze: "Dev can freeze it. Spot won't buy it.",
  delegate: "Dev can take your coins. Spot won't buy it.",
  tax: "The tax eats your bag. Spot won't buy it.",
};

/* A dev's mint key is forgiven on a blue chip, whatever its numbers say
   today (a coin on Spot's own list, Seeker's SKR among them, keeps its key
   to mint on a schedule), and on a coin that has outgrown printing and
   dumping: verified, a pool of $250k or more, 5,000 holders or more, and
   trading Jupiter scores as organic, medium or high. All four at once.
   Looser than core's established bar, which also makes a coin a blue chip
   and skips its test trade; this one only quiets the mint check. Core's
   bar knows only "high", so "medium" is let in beside it. */
const OUTGROWN: EstablishedBar = { minLiquidityUsd: 250_000, minHolderCount: 5_000, requireVerified: true, requireHighOrganic: false };

export function judge(f: Facts, policy: Policy = DEFAULT_POLICY): Sniff {
  const { info } = f;
  const t = policy.thresholds;
  const issued = issuedAsset(info.id) !== undefined;
  const chain = f.chain.ok ? f.chain.value : null;
  const checks: Check[] = [];
  const add = (c: Omit<Check, "observed" | "threshold"> & Partial<Pick<Check, "observed" | "threshold">>) =>
    checks.push({ ...c, observed: c.observed ?? null, threshold: c.threshold ?? null });

  /* ---- the way in, and the way out ---- */
  let roundTrip: Sniff["roundTrip"] = null;
  if (f.buy && !f.buy.ok && f.buy.reason === "no_route") {
    add({ id: "route", label: "Can you buy it?", answer: "Not now", status: "bad", blocks: true, note: "There's no way to buy it with USDC right now.", observed: "no_route" });
  }
  const honeypot = (answer: string, status: Status, blocks: boolean, note: string | null, observed: Check["observed"]) =>
    add({ id: "honeypot", label: "Honeypot?", answer, status, blocks, note, observed, threshold: policy.honeypotLoss });
  if (chain?.nonTransferable) {
    honeypot("Yes", "bad", true, "This coin can't be sent, so it can't be sold.", "non_transferable");
  } else if (f.blueChip) {
    honeypot("No", "good", false, "Blue chip: it trades everywhere.", "blue_chip");
  } else if (!f.buy || !f.buy.ok) {
    const reason = f.buy ? f.buy.reason : "not_asked";
    const noWayIn = reason === "no_route";
    honeypot("?", "unknown", !noWayIn, noWayIn ? "Can't buy it, so selling couldn't be tested." : "Couldn't test selling it. Try again.", reason);
  } else if (!f.sell?.ok) {
    const reason = f.sell?.reason ?? "not_asked";
    if (reason === "no_route") honeypot("Yes", "bad", true, "There's no way to sell it.", "no_route");
    else honeypot("?", "unknown", true, "Couldn't test selling it. Try again.", reason);
  } else {
    const inRaw = Number(f.buy.value.inAmount);
    const outRaw = Number(f.sell.value.outAmount);
    const loss = inRaw > 0 ? Math.round(Math.min(1, Math.max(0, 1 - outRaw / inRaw)) * 1e4) / 1e4 : 1;
    roundTrip = {
      inUsdc: Math.round(inRaw / 1e4) / 100,
      outUsdc: Math.round(outRaw / 1e4) / 100,
      lossPct: Math.round(loss * 1000) / 10,
    };
    if (loss >= policy.honeypotLoss) {
      honeypot("Yes", "bad", true, `Sell right after buying and you get only ${pct(1 - loss)} back.`, loss);
    } else if (loss >= policy.thinExitLoss) {
      honeypot("Kinda", "warn", false, `Sell right after buying and you lose ${pct(loss)}.`, loss);
    } else {
      honeypot("No", "good", false, null, loss);
    }
  }

  /* ---- keys that can take the bag ----
     The chain's word when it answered, Ultra's otherwise. An issued asset
     (a tokenized stock, a bridged coin) keeps its keys on purpose; that is
     shown, not held against it. */
  const freezeKey = chain ? chain.freezeAuthority : ultraAuthority(info, "freeze") === "retained" ? "retained" : null;
  const pauseKey = chain?.pause?.authority ?? null;
  const freeze = (answer: string, status: Status, blocks: boolean, note: string | null) =>
    add({ id: "freeze", label: "Dev can freeze it?", answer, status, blocks, note, observed: freezeKey ?? pauseKey });
  if (chain?.pause?.paused) freeze("Yes", "bad", true, "Nobody can move this coin right now.");
  else if (issued && (freezeKey || pauseKey)) freeze("Issuer", "info", false, "Normal for stock coins: the issuer can lock them.");
  else if (freezeKey) freeze("Yes", "bad", true, "The dev can lock your coins so you can't sell.");
  else if (pauseKey) freeze("Yes", "bad", true, "The dev can stop all trading.");
  else if (chain?.startsFrozen) freeze("Yes", "bad", true, "New buyers get locked until the dev lets them out.");
  else freeze("No", "good", false, null);

  /* A permanent delegate exists only on Token-2022. When the chain did not
     answer and the token is not known to be a classic SPL token, nobody
     has read the settings that could take the bag, so the buy waits. */
  if (chain?.permanentDelegate) {
    add(
      issued
        ? { id: "delegate", label: "Dev can take it?", answer: "Issuer", status: "info", blocks: false, note: "Normal for stock coins: the issuer can move them.", observed: chain.permanentDelegate }
        : { id: "delegate", label: "Dev can take it?", answer: "Yes", status: "bad", blocks: true, note: "The dev can take or burn anyone's coins.", observed: chain.permanentDelegate },
    );
  } else if (!chain && info.tokenProgram !== TOKEN_PROGRAM && !issued) {
    add({ id: "delegate", label: "Dev can take it?", answer: "?", status: "unknown", blocks: true, note: "Couldn't read this coin's settings. Try again.", observed: f.chain.ok ? null : f.chain.reason });
  }

  const outgrown = isEstablished(info, OUTGROWN) && (info.organicScoreLabel === "medium" || info.organicScoreLabel === "high");

  const mintKey = chain ? chain.mintAuthority : ultraAuthority(info, "mint") === "retained" ? "retained" : null;
  const mint = (answer: string, status: Status, note: string | null) =>
    add({ id: "mint", label: "Dev can print more?", answer, status, blocks: false, note, observed: mintKey });
  if (!mintKey) mint("No", "good", null);
  else if (issued) mint("Issuer", "info", "Normal for stock coins.");
  else if (f.blueChip || outgrown) mint("Yes", "info", "Normal for a big, verified coin.");
  else mint("Yes", "warn", "New coins can be printed and dumped on you.");

  if (chain?.transferFeeBps) {
    const share = chain.transferFeeBps / 10_000;
    const ruinous = share >= policy.honeypotLoss;
    add({
      id: "tax",
      label: "Tax on trades?",
      answer: pct(share),
      status: issued ? "info" : ruinous ? "bad" : "warn",
      blocks: ruinous && !issued,
      note: ruinous ? "Half or more of every trade goes to tax." : `Every buy and sell pays ${pct(share)}.`,
      observed: chain.transferFeeBps,
      threshold: policy.honeypotLoss * 10_000,
    });
  }
  if (chain?.transferHook) {
    add({ id: "hook", label: "Can it block sells?", answer: "Maybe", status: issued ? "info" : "warn", blocks: false, note: "The coin runs its own code on every trade, which could stop a sell.", observed: chain.transferHook });
  }

  /* ---- size: only ever a growl ----
     The floors (CLEAN_FLOORS) decide how loud the warning is, never
     whether the coin can be bought. An issued asset is thin by nature, and
     a blue chip (on Spot's own list, or big and old by Jupiter's record)
     has been vetted already: on either, a small figure is shown, not held
     against it, and a figure Jupiter didn't send is a gap, not a risk. */
  const small = issued || f.blueChip ? "info" : "warn";
  const gap = issued || f.blueChip ? "info" : "unknown";
  const liq = num(info.liquidity);
  add({
    id: "liquidity",
    label: "Big enough pool?",
    ...(liq === undefined
      ? { answer: "?", status: gap, note: null }
      : liq >= t.minLiquidityUsd
        ? { answer: usd(liq), status: "good", note: null }
        : { answer: `Only ${usd(liq)}`, status: small, note: "Small pool: your buy moves the price." }),
    blocks: false,
    observed: liq ?? null,
    threshold: t.minLiquidityUsd,
  });

  const holders = num(info.holderCount);
  add({
    id: "holders",
    label: "Enough holders?",
    ...(holders === undefined
      ? { answer: "?", status: gap, note: null }
      : holders >= t.minHolderCount
        ? { answer: count(holders), status: "good", note: null }
        : { answer: `Only ${count(holders)}`, status: small, note: null }),
    blocks: false,
    observed: holders ?? null,
    threshold: t.minHolderCount,
  });

  const created = Date.parse(info.firstPool?.createdAt ?? "");
  const ageMs = Number.isFinite(created) ? f.now - created : null;
  add({
    id: "age",
    label: "How old?",
    ...(ageMs === null
      ? { answer: "?", status: gap, note: null }
      : ageMs >= t.minPoolAgeMs
        ? { answer: age(ageMs), status: "good", note: null }
        : { answer: age(ageMs), status: small, note: "Just launched." }),
    blocks: false,
    observed: ageMs,
    threshold: t.minPoolAgeMs,
  });

  if (info.audit?.isSus === true) {
    add({ id: "flagged", label: "Flagged?", answer: "Sus", status: "warn", blocks: false, note: "Jupiter's scam scanner flags this coin.", observed: true });
  }

  /* ---- the verdict ---- */
  const blocker = checks.find((c) => c.blocks && c.status === "bad");
  const level: Level = blocker
    ? "block"
    : checks.some((c) => c.blocks && c.status === "unknown")
      ? "unknown"
      : checks.some((c) => c.status === "warn" || c.status === "unknown")
        ? "warn"
        : "ok";

  const maxBuyUsdc =
    level === "ok"
      ? null
      : level === "warn"
        ? Math.min(policy.warnCapUsdc, liq === undefined ? 10 : Math.max(1, Math.floor(liq * 0.02)))
        : 0;

  const headline =
    level === "block"
      ? (BLOCK_HEADLINE[blocker!.id] ?? `${blocker!.note ?? "Too risky."} Spot won't buy it.`)
      : level === "unknown"
        ? "Couldn't finish the sniff. Try again."
        : level === "warn"
          ? `GRRR. Risky. Ape $${maxBuyUsdc} max.`
          : f.blueChip
            ? "Blue chip. Nothing smells off."
            : "Nothing smells off.";

  return {
    mint: info.id,
    level,
    headline,
    token: cardOf(info),
    checks,
    maxBuyUsdc,
    roundTrip,
    checkedAt: new Date(f.now).toISOString(),
  };
}

export interface SniffDeps {
  search: UltraSearchClient;
  quote: Quoter;
  readMint: MintReader;
  now?: () => number;
  policy?: Policy;
}

export type SniffError = "not_found" | "not_a_mint" | "lookup_failed";

/** What a sniff is sized to when nobody says: the app's first chip, the landing's buy sheet. */
export const SNIFF_USDC = 25;

/** A size a sniff takes, $1 to $10,000 and in cents, or null for any other. */
export function sniffSize(usdc: number): number | null {
  return Number.isFinite(usdc) && usdc >= 1 && usdc <= 10_000 ? Math.round(usdc * 100) / 100 : null;
}

/**
 * Four questions, three of them at once: the token's record, its mint
 * account, and a buy quote; then the sell of exactly what that buy would
 * get back. Two to four seconds at worst, each upstream on its own clock.
 * A coin in the catalog is not quoted at all, and one Jupiter's record
 * shows to be established is not sold back: both are blue chips.
 */
export async function sniff(mint: string, amountUsdc: number, deps: SniffDeps): Promise<Outcome<Sniff, SniffError>> {
  const amount = String(Math.round(amountUsdc * 1e6));
  const curated = curatedByMint(mint) !== undefined;
  const [found, chain, buy] = await Promise.all([
    deps.search.search(mint, { timeoutMs: 2_500 }),
    deps.readMint(mint),
    curated ? Promise.resolve(null) : deps.quote({ inputMint: USDC_MINT, outputMint: mint, amount }),
  ]);
  if (!chain.ok && chain.reason === "not_a_mint") return { ok: false, reason: "not_a_mint" };
  if (!found.ok) return { ok: false, reason: "lookup_failed" };
  const info = found.value.find((x) => x.id === mint);
  if (!info) return { ok: false, reason: "not_found" };

  const blueChip = curated || isEstablished(info);
  const sell = buy?.ok && !blueChip ? await deps.quote({ inputMint: mint, outputMint: USDC_MINT, amount: buy.value.outAmount }) : null;
  const now = (deps.now ?? Date.now)();
  return { ok: true, value: judge({ info, chain, buy, sell, blueChip, amountUsdc, now }, deps.policy) };
}
