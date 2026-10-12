import { TOKEN_2022_PROGRAM, TOKEN_PROGRAM } from "./address";
import { bindFetch, fetchText, isRecord, num, parseJson, str, type Fetch, type Outcome } from "./http";

/**
 * THE MINT, READ FROM THE CHAIN. An indexer's copy of who holds the mint
 * and freeze keys is usually right; the account itself is always right, and
 * it is the only place the Token-2022 settings that can take a bag away are
 * written down: a permanent delegate, a pause switch, a transfer hook, a
 * transfer fee, accounts that start frozen, tokens that cannot move at all.
 *
 * One getAccountInfo with jsonParsed, which every Solana RPC answers.
 */

export const PUBLIC_RPC = "https://api.mainnet-beta.solana.com";

export interface MintFacts {
  program: "classic" | "token-2022";
  decimals: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  /** Token-2022: may move or burn anyone's balance. */
  permanentDelegate: string | null;
  /** Token-2022: the higher of the two scheduled fees, in basis points. */
  transferFeeBps: number | null;
  /** Token-2022: a program that runs on every transfer. */
  transferHook: string | null;
  /** Token-2022: the tokens cannot be moved at all. */
  nonTransferable: boolean;
  /** Token-2022: new accounts start frozen until the authority thaws them. */
  startsFrozen: boolean;
  /** Token-2022: someone can pause every transfer, or already has. */
  pause: { authority: string | null; paused: boolean } | null;
}

export type MintFailure = "not_found" | "not_a_mint" | "timeout" | "network_error" | "http_error" | "rate_limited" | "bad_shape";

export type MintReader = (mint: string) => Promise<Outcome<MintFacts, MintFailure>>;

const orNull = (v: unknown): string | null => str(v) ?? null;

/** The parsed account, or the reason it is not a mint. Exported for the specs. */
export function mintFactsOf(value: unknown): Outcome<MintFacts, MintFailure> {
  if (value === null) return { ok: false, reason: "not_found" };
  if (!isRecord(value)) return { ok: false, reason: "bad_shape" };
  const owner = str(value.owner);
  if (owner !== TOKEN_PROGRAM && owner !== TOKEN_2022_PROGRAM) return { ok: false, reason: "not_a_mint" };
  const data = value.data;
  const parsed = isRecord(data) && isRecord(data.parsed) ? data.parsed : undefined;
  if (!parsed || parsed.type !== "mint" || !isRecord(parsed.info)) return { ok: false, reason: "not_a_mint" };
  const info = parsed.info;
  const decimals = num(info.decimals);
  if (decimals === undefined) return { ok: false, reason: "bad_shape" };

  const facts: MintFacts = {
    program: owner === TOKEN_2022_PROGRAM ? "token-2022" : "classic",
    decimals,
    mintAuthority: orNull(info.mintAuthority),
    freezeAuthority: orNull(info.freezeAuthority),
    permanentDelegate: null,
    transferFeeBps: null,
    transferHook: null,
    nonTransferable: false,
    startsFrozen: false,
    pause: null,
  };

  for (const ext of Array.isArray(info.extensions) ? info.extensions : []) {
    if (!isRecord(ext)) continue;
    const state = isRecord(ext.state) ? ext.state : {};
    switch (ext.extension) {
      case "permanentDelegate":
        facts.permanentDelegate = orNull(state.delegate);
        break;
      case "transferFeeConfig": {
        const bps = [state.olderTransferFee, state.newerTransferFee]
          .map((f) => (isRecord(f) ? num(f.transferFeeBasisPoints) : undefined))
          .filter((n): n is number => n !== undefined);
        facts.transferFeeBps = bps.length ? Math.max(...bps) : 0;
        break;
      }
      case "transferHook":
        facts.transferHook = orNull(state.programId);
        break;
      case "nonTransferable":
        facts.nonTransferable = true;
        break;
      case "defaultAccountState":
        facts.startsFrozen = state.accountState === "frozen";
        break;
      case "pausableConfig":
        facts.pause = { authority: orNull(state.authority), paused: state.paused === true };
        break;
    }
  }
  return { ok: true, value: facts };
}

export type RpcFailure = "timeout" | "network_error" | "http_error" | "rate_limited" | "bad_shape";

/** One JSON-RPC call: the `result`, or why there is none. */
export async function rpcCall(
  fetchFn: Fetch,
  rpcUrl: string,
  method: string,
  params: unknown[],
  timeoutMs: number,
): Promise<Outcome<Record<string, unknown>, RpcFailure>> {
  const res = await fetchText(fetchFn, rpcUrl, {
    timeoutMs,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) return res;
  if (res.value.status === 429) return { ok: false, reason: "rate_limited" };
  const body = parseJson(res.value.text);
  if (res.value.status !== 200 || !isRecord(body)) return { ok: false, reason: "http_error" };
  if (body.error !== undefined) return { ok: false, reason: "http_error" };
  if (!isRecord(body.result) || !("value" in body.result)) return { ok: false, reason: "bad_shape" };
  return { ok: true, value: body.result };
}

export function makeMintReader(rpcUrl: string, opts: { fetchFn?: Fetch; timeoutMs?: number } = {}): MintReader {
  const fetchFn = bindFetch(opts.fetchFn ?? fetch);
  const timeoutMs = opts.timeoutMs ?? 2_000;

  return async (mint) => {
    const res = await rpcCall(fetchFn, rpcUrl, "getAccountInfo", [mint, { encoding: "jsonParsed", commitment: "confirmed" }], timeoutMs);
    return res.ok ? mintFactsOf(res.value.value) : res;
  };
}

/** A wallet's balance of one mint, all its token accounts for that mint added up. */
export interface TokenBalance {
  mint: string;
  /** Raw base units, as a string: amounts outgrow a float's exact range. */
  raw: string;
  amount: number;
  decimals: number;
}

export interface WalletAccounts {
  /** Native SOL, in SOL. */
  sol: number;
  tokens: TokenBalance[];
}

export type AccountsReader = (owner: string) => Promise<Outcome<WalletAccounts, RpcFailure>>;

/** Token accounts from one getTokenAccountsByOwner answer (jsonParsed). Exported for the specs. */
export function balancesOf(value: unknown): TokenBalance[] {
  const out: TokenBalance[] = [];
  for (const row of Array.isArray(value) ? value : []) {
    const data = isRecord(row) && isRecord(row.account) ? row.account.data : undefined;
    const parsed = isRecord(data) && isRecord(data.parsed) ? data.parsed : undefined;
    const info = parsed && isRecord(parsed.info) ? parsed.info : undefined;
    const amount = info && isRecord(info.tokenAmount) ? info.tokenAmount : undefined;
    const mint = str(info?.mint);
    const raw = str(amount?.amount);
    const decimals = num(amount?.decimals);
    if (!mint || !raw || !/^\d+$/.test(raw) || decimals === undefined) continue;
    out.push({ mint, raw, amount: Number(raw) / 10 ** decimals, decimals });
  }
  return out;
}

/**
 * EVERYTHING A WALLET HOLDS, from the chain: its SOL, and its token accounts
 * under both token programs (a Token-2022 coin is invisible to a classic-only
 * query). Several accounts of one mint are added into one balance.
 */
export function makeAccountsReader(rpcUrl: string, opts: { fetchFn?: Fetch; timeoutMs?: number } = {}): AccountsReader {
  const fetchFn = bindFetch(opts.fetchFn ?? fetch);
  const timeoutMs = opts.timeoutMs ?? 4_000;
  const byProgram = (wallet: string, programId: string) =>
    rpcCall(fetchFn, rpcUrl, "getTokenAccountsByOwner", [wallet, { programId }, { encoding: "jsonParsed", commitment: "confirmed" }], timeoutMs);

  return async (wallet) => {
    const [classic, t22, balance] = await Promise.all([
      byProgram(wallet, TOKEN_PROGRAM),
      byProgram(wallet, TOKEN_2022_PROGRAM),
      rpcCall(fetchFn, rpcUrl, "getBalance", [wallet, { commitment: "confirmed" }], timeoutMs),
    ]);
    if (!classic.ok) return classic;
    if (!t22.ok) return t22;
    if (!balance.ok) return balance;
    const lamports = num(balance.value.value);
    if (lamports === undefined) return { ok: false, reason: "bad_shape" };

    const merged = new Map<string, TokenBalance>();
    for (const b of [...balancesOf(classic.value.value), ...balancesOf(t22.value.value)]) {
      const seen = merged.get(b.mint);
      if (!seen) merged.set(b.mint, b);
      else {
        const raw = (BigInt(seen.raw) + BigInt(b.raw)).toString();
        merged.set(b.mint, { ...seen, raw, amount: Number(raw) / 10 ** seen.decimals });
      }
    }
    return { ok: true, value: { sol: lamports / 1e9, tokens: [...merged.values()] } };
  };
}

/**
 * WHERE A SENT TRANSACTION STANDS, by its signature: on the chain and done,
 * on the chain and failed, or nowhere yet (still flying, dropped, or never
 * sent). "Processed" is not counted as landed: a processed block can still
 * be skipped.
 */
export type Landing = "landed" | "failed" | "unknown";

export type SignatureReader = (signature: string) => Promise<Outcome<Landing, RpcFailure>>;

export function landingOf(value: unknown): Landing {
  const row = Array.isArray(value) ? value[0] : undefined;
  if (!isRecord(row)) return "unknown";
  if (row.err !== null && row.err !== undefined) return "failed";
  const status = str(row.confirmationStatus);
  return status === "confirmed" || status === "finalized" ? "landed" : "unknown";
}

export function makeSignatureReader(rpcUrl: string, opts: { fetchFn?: Fetch; timeoutMs?: number } = {}): SignatureReader {
  const fetchFn = bindFetch(opts.fetchFn ?? fetch);
  const timeoutMs = opts.timeoutMs ?? 3_000;
  return async (signature) => {
    const res = await rpcCall(fetchFn, rpcUrl, "getSignatureStatuses", [[signature], { searchTransactionHistory: true }], timeoutMs);
    return res.ok ? { ok: true, value: landingOf(res.value.value) } : res;
  };
}
