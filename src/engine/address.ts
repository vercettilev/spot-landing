import { SOL_MINT, USDC_MINT } from "@/core/route/jupiter";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const DIGIT = new Map([...ALPHABET].map((c, i) => [c, i]));

/* The same run the extractor looks for: 32 to 44 base58 characters with no
   base58 neighbour on either side. */
const RUN = /(?<![1-9A-HJ-NP-Za-km-z])[1-9A-HJ-NP-Za-km-z]{32,44}(?![1-9A-HJ-NP-Za-km-z])/g;

export const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

/** What a pair is quoted in. The coin is the other side. */
export const QUOTE_MINTS: ReadonlySet<string> = new Set([USDC_MINT, USDT_MINT, SOL_MINT]);

/**
 * ADDRESSES THAT ARE NEVER THE COIN SOMEONE MEANT. Links and posts are full
 * of them: a jup.ag link carries USDC as its other side, an explorer link a
 * program id. Left in, each costs a lookup and can turn one clear coin into
 * a false "which one?".
 */
const NOT_COINS: ReadonlySet<string> = new Set([
  ...QUOTE_MINTS,
  "11111111111111111111111111111111", // system program
  TOKEN_PROGRAM,
  TOKEN_2022_PROGRAM,
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL", // associated token accounts
  "ComputeBudget111111111111111111111111111111",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s", // Metaplex metadata
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter aggregator v6
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", // pump.fun bonding curve
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", // PumpSwap
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM v4
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo", // Meteora DLMM
]);

/** How many bytes a base58 string stands for, or null if it is not base58. */
export function decodedLength(s: string): number | null {
  let zeros = 0;
  while (zeros < s.length && s[zeros] === "1") zeros++;
  const bytes: number[] = [];
  for (const ch of s) {
    const digit = DIGIT.get(ch);
    if (digit === undefined) return null;
    let carry = digit;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i]! * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  return zeros + bytes.length;
}

/**
 * A Solana address: base58 that decodes to exactly 32 bytes. The length
 * check alone lets through base58-looking words and truncated pastes; the
 * decode does not.
 */
export function isAddress(s: string): boolean {
  return s.length >= 32 && s.length <= 44 && decodedLength(s) === 32;
}

/** Every address in a piece of text, first seen first, coins only. */
export function findAddresses(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(RUN)) {
    const a = m[0];
    if (!NOT_COINS.has(a) && isAddress(a) && !out.includes(a)) out.push(a);
  }
  return out;
}

/** True for an address that names something other than a coin. */
export const isNotCoin = (a: string): boolean => NOT_COINS.has(a);
