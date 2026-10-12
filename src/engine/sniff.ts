import type { UltraSearchClient } from "@/core/resolve/ultra";
import { USDC_MINT } from "@/core/route/jupiter";
import { DEFAULT_THRESHOLDS, isEstablished, type OpenMintThresholds } from "@/core/safety/open-mint-gate";
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
 * coin that had already failed; here the probe always runs, because it is
 * the one check that asks whether the exit exists instead of inferring it.
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

export const DEFAULT_POLICY: Policy = {
  thresholds: DEFAULT_THRESHOLDS,
  warnCapUsdc: 50,
  honeypotLoss: 0.5,
  thinExitLoss: 0.15,
};

/** Everything the verdict is made from, gathered before any of it is judged. */
export interface Facts {
  info: TokenInfo;
  chain: Outcome<MintFacts, MintFailure>;
  buy: Outcome<Quote, QuoteFailure>;
  /** Null when there was no buy quote to sell back. */
  sell: Outcome<Quote, QuoteFailure> | null;
  amountUsdc: number;
  now: number;
}

const pct = (share: number) => {
  const p = share * 100;
  return `${p < 10 ? Math.round(p * 10) / 10 : Math.round(p)}%`;
};

const usd = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}k` : `$${Math.round(n)}`;

const count = (n: number) => n.toLocaleString("en-US");

export function age(ms: number): string {
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${Math.max(min, 0)} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h`;
  const d = Math.floor(h / 24);
  return d < 730 ? `${d} days` : `${Math.floor(d / 365)} yrs`;
}

const BLOCK_HEADLINE: Partial<Record<CheckId, string>> = {
  route: "No route to buy this right now.",
  honeypot: "Honeypot. Spot won't buy it.",
  delegate: "Dev can take your bag. Spot won't buy it.",
  tax: "The tax eats the bag. Spot won't buy it.",
};

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
  if (!f.buy.ok && f.buy.reason === "no_route") {
    add({ id: "route", label: "Can Spot buy it?", answer: "No route", status: "bad", blocks: true, note: "No route from USDC to this coin right now.", observed: "no_route" });
  }
  const honeypot = (answer: string, status: Status, blocks: boolean, note: string | null, observed: Check["observed"]) =>
    add({ id: "honeypot", label: "Honeypot?", answer, status, blocks, note, observed, threshold: policy.honeypotLoss });
  if (chain?.nonTransferable) {
    honeypot("Yes", "bad", true, "This token can't be moved, so it can't be sold.", "non_transferable");
  } else if (!f.buy.ok) {
    const noWayIn = f.buy.reason === "no_route";
    honeypot("?", "unknown", !noWayIn, noWayIn ? "No way in, so no way out to test." : "Couldn't check the exit. Try again.", f.buy.reason);
  } else if (!f.sell?.ok) {
    const reason = f.sell?.reason ?? "not_asked";
    if (reason === "no_route") honeypot("Yes", "bad", true, "No route to sell it back to USDC.", "no_route");
    else honeypot("?", "unknown", true, "Couldn't check the exit. Try again.", reason);
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
      honeypot("Yes", "bad", true, `Selling straight back returns only ${pct(1 - loss)}.`, loss);
    } else if (loss >= policy.thinExitLoss) {
      honeypot(`Exit −${pct(loss)}`, "warn", false, `Selling straight back loses ${pct(loss)}: a thin pool or a tax.`, loss);
    } else {
      honeypot("No", "good", false, `Round trip −${pct(loss)}.`, loss);
    }
  }

  /* ---- keys that can take the bag ----
     The chain's word when it answered, Ultra's otherwise. An issued asset
     (a tokenized stock, a bridged coin) keeps its keys on purpose; that is
     shown, not held against it. */
  const freezeKey = chain ? chain.freezeAuthority : ultraAuthority(info, "freeze") === "retained" ? "retained" : null;
  const pauseKey = chain?.pause?.authority ?? null;
  const freeze = (answer: string, status: Status, blocks: boolean, note: string | null) =>
    add({ id: "freeze", label: "Freeze revoked?", answer, status, blocks, note, observed: freezeKey ?? pauseKey });
  if (chain?.pause?.paused) freeze("No", "bad", true, "Transfers are paused right now.");
  else if (issued && (freezeKey || pauseKey)) freeze("No", "info", false, "The issuer keeps a freeze key, as tokenized assets do.");
  else if (freezeKey) freeze("No", "bad", true, "Dev can freeze your bag.");
  else if (pauseKey) freeze("No", "bad", true, "Dev can pause every transfer.");
  else if (chain?.startsFrozen) freeze("No", "bad", true, "New holders start frozen.");
  else freeze("Yes", "good", false, null);

  /* A permanent delegate exists only on Token-2022. When the chain did not
     answer and the token is not known to be a classic SPL token, nobody
     has read the settings that could take the bag, so the buy waits. */
  if (chain?.permanentDelegate) {
    add(
      issued
        ? { id: "delegate", label: "Can dev take it?", answer: "Issuer", status: "info", blocks: false, note: "The issuer can move holdings, as tokenized assets allow.", observed: chain.permanentDelegate }
        : { id: "delegate", label: "Can dev take it?", answer: "Yes", status: "bad", blocks: true, note: "A permanent delegate can move or burn anyone's tokens.", observed: chain.permanentDelegate },
    );
  } else if (!chain && info.tokenProgram !== TOKEN_PROGRAM && !issued) {
    add({ id: "delegate", label: "Can dev take it?", answer: "?", status: "unknown", blocks: true, note: "Couldn't read this token's settings. Try again.", observed: f.chain.ok ? null : f.chain.reason });
  }

  const mintKey = chain ? chain.mintAuthority : ultraAuthority(info, "mint") === "retained" ? "retained" : null;
  const mint = (answer: string, status: Status, note: string | null) =>
    add({ id: "mint", label: "Mint revoked?", answer, status, blocks: false, note, observed: mintKey });
  if (!mintKey) mint("Yes", "good", null);
  else if (issued) mint("No", "info", "The issuer mints it.");
  else if (isEstablished(info)) mint("No", "info", "Big, old and verified: likely a bridge or a DAO.");
  else mint("No", "warn", "Dev can still print more.");

  if (chain?.transferFeeBps) {
    const share = chain.transferFeeBps / 10_000;
    const ruinous = share >= policy.honeypotLoss;
    add({
      id: "tax",
      label: "Transfer tax?",
      answer: pct(share),
      status: issued ? "info" : ruinous ? "bad" : "warn",
      blocks: ruinous && !issued,
      note: ruinous ? "The tax takes half or more of every transfer." : `Every transfer pays ${pct(share)}.`,
      observed: chain.transferFeeBps,
      threshold: policy.honeypotLoss * 10_000,
    });
  }
  if (chain?.transferHook) {
    add({ id: "hook", label: "Transfer hook?", answer: "Yes", status: issued ? "info" : "warn", blocks: false, note: "Custom code runs on every transfer and could stop a sell.", observed: chain.transferHook });
  }

  /* ---- size: only ever a growl ----
     The floors are spot-core's, which were calibrated to tell established
     from fresh. Here they decide how loud the warning is, never whether
     the coin can be bought. An issued asset is thin by nature. */
  const small = issued ? "info" : "warn";
  const liq = num(info.liquidity);
  add({
    id: "liquidity",
    label: "Enough liquidity?",
    ...(liq === undefined
      ? { answer: "?", status: issued ? "info" : "unknown", note: null }
      : liq >= t.minLiquidityUsd
        ? { answer: "Yes", status: "good", note: null }
        : { answer: `Only ${usd(liq)}`, status: small, note: "Thin pool: a big buy moves the price." }),
    blocks: false,
    observed: liq ?? null,
    threshold: t.minLiquidityUsd,
  });

  const holders = num(info.holderCount);
  add({
    id: "holders",
    label: "Enough holders?",
    ...(holders === undefined
      ? { answer: "?", status: issued ? "info" : "unknown", note: null }
      : holders >= t.minHolderCount
        ? { answer: "Yes", status: "good", note: null }
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
      ? { answer: "?", status: issued ? "info" : "unknown", note: null }
      : ageMs >= t.minPoolAgeMs
        ? { answer: age(ageMs), status: "good", note: null }
        : { answer: age(ageMs), status: small, note: "Fresh launch." }),
    blocks: false,
    observed: ageMs,
    threshold: t.minPoolAgeMs,
  });

  if (info.audit?.isSus === true) {
    add({ id: "flagged", label: "Jupiter flag?", answer: "Sus", status: "warn", blocks: false, note: "Jupiter's own scan flags this token.", observed: true });
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
          ? `GRRR. Ape small: ${maxBuyUsdc} USDC max.`
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

/**
 * Four questions, three of them at once: the token's record, its mint
 * account, and a buy quote; then the sell of exactly what that buy would
 * get back. Two to four seconds at worst, each upstream on its own clock.
 */
export async function sniff(mint: string, amountUsdc: number, deps: SniffDeps): Promise<Outcome<Sniff, SniffError>> {
  const amount = String(Math.round(amountUsdc * 1e6));
  const [found, chain, buy] = await Promise.all([
    deps.search.search(mint, { timeoutMs: 2_500 }),
    deps.readMint(mint),
    deps.quote({ inputMint: USDC_MINT, outputMint: mint, amount }),
  ]);
  if (!chain.ok && chain.reason === "not_a_mint") return { ok: false, reason: "not_a_mint" };
  if (!found.ok) return { ok: false, reason: "lookup_failed" };
  const info = found.value.find((x) => x.id === mint);
  if (!info) return { ok: false, reason: "not_found" };

  const sell = buy.ok ? await deps.quote({ inputMint: mint, outputMint: USDC_MINT, amount: buy.value.outAmount }) : null;
  const now = (deps.now ?? Date.now)();
  return { ok: true, value: judge({ info, chain, buy, sell, amountUsdc, now }, deps.policy) };
}
