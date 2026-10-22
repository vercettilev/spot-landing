import { Platform } from "react-native";
import { toAddress } from "./base58";
import { sessionAt, walletHome } from "./home";

/**
 * Mobile Wallet Adapter: the wallet already on the phone (Seed Vault on a
 * Seeker, Phantom, Solflare) connects, and signs what Spot asks it to,
 * in its own screen. Spot never sees a key. Android only; elsewhere the
 * app watches an address instead.
 */

export const MWA_AVAILABLE = Platform.OS === "android";

const IDENTITY = { name: "Spot", uri: "https://www.usespot.fun", icon: "favicon.ico" };
const CHAIN = "solana:mainnet";

type Protocol = typeof import("@solana-mobile/mobile-wallet-adapter-protocol");

/* Loaded on first use, not at startup: the module looks for its native half
   as it loads, and a phone where that fails should lose the wallet button,
   not the app. */
let protocol: Protocol | null = null;
function load(): Protocol {
  if (!MWA_AVAILABLE) throw Object.assign(new Error("Wallets connect in the Android app."), { code: "ERROR_WALLET_NOT_FOUND" });
  protocol ??= require("@solana-mobile/mobile-wallet-adapter-protocol") as Protocol;
  return protocol;
}

export interface Connected {
  address: string;
  label: string | null;
  authToken: string;
  walletUriBase: string | null;
}

/* Each account's wallet, where it asked to be found again (src/wallet/home.ts):
   told at connect, and again whenever the wallet renews Spot's access. The
   store is told of every change, to keep it for the next start. */
const homes = new Map<string, string>();
let keeper: ((address: string, home: string | null) => void) | null = null;

/** The wallet an account is connected through, as the app knows it: its home goes with it into every later session. */
export function rememberWallet(address: string, walletUriBase: string | null): void {
  const home = walletHome(walletUriBase);
  if (home === (homes.get(address) ?? null)) return;
  if (home) homes.set(address, home);
  else homes.delete(address);
  keeper?.(address, home);
}

/** Where this account's wallet asked to be found, if it did. */
export const homeOf = (address: string): string | null => homes.get(address) ?? null;

/** Who keeps the homes for the next start. */
export function keepHomes(listener: ((address: string, home: string | null) => void) | null): void {
  keeper = listener;
}

export async function connectWallet(): Promise<Connected> {
  return load().transact(async (wallet) => {
    const auth = await wallet.authorize({ chain: CHAIN, identity: IDENTITY });
    const account = auth.accounts[0];
    if (!account) throw new Error("The wallet shared no account.");
    const address = toAddress(account.address);
    rememberWallet(address, auth.wallet_uri_base ?? null);
    return {
      address,
      label: ("label" in account && typeof account.label === "string" ? account.label : null) ?? null,
      authToken: auth.auth_token,
      walletUriBase: homeOf(address),
    };
  });
}

type Session = Parameters<Parameters<Protocol["transact"]>[0]>[0];

/* A saved token goes stale (the wallet was reinstalled, or forgot Spot):
   then the wallet asks its owner once more, instead of every trade from
   here on failing the same way. */
async function authorize(wallet: Session, authToken: string | null) {
  if (authToken) {
    try {
      return await wallet.authorize({ chain: CHAIN, identity: IDENTITY, auth_token: authToken });
    } catch {
      /* asked again below */
    }
  }
  return wallet.authorize({ chain: CHAIN, identity: IDENTITY });
}

/**
 * One transaction, signed by the wallet (not sent: Jupiter lands it), and
 * only by the account the order was made out to: a wallet switched to
 * another account would sign a transaction that cannot land. The session
 * opens at the wallet's home when it gave one, so Android doesn't ask
 * which wallet app to use.
 */
export async function signTransaction(transaction: string, authToken: string | null, address: string): Promise<{ signed: string; authToken: string }> {
  const session = async (wallet: Session) => {
    const auth = await authorize(wallet, authToken);
    if (!auth.accounts.some((a) => toAddress(a.address) === address)) {
      throw Object.assign(new Error("The wallet is on another account."), { code: "SPOT_WRONG_ACCOUNT" });
    }
    if (auth.wallet_uri_base) rememberWallet(address, auth.wallet_uri_base);
    const { signed_payloads } = await wallet.signTransactions({ payloads: [transaction] });
    const signed = signed_payloads[0];
    if (!signed) throw new Error("The wallet returned nothing to send.");
    return { signed, authToken: auth.auth_token };
  };
  return sessionAt(async (run, config) => load().transact(run, config), homeOf(address), session, () => rememberWallet(address, null));
}

/** Why a wallet session ended without an answer, in words. */
export function walletError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const message = String((e as Error)?.message ?? "");
  if (code === "ERROR_WALLET_NOT_FOUND") return "No wallet app on this phone. Get Phantom or Solflare (a Seeker already has one).";
  if (code === "SPOT_WRONG_ACCOUNT") return "Your wallet is on another account. Switch back, or reconnect in Settings.";
  if (code === "ERROR_ASSOCIATION_CANCELLED" || /declin|reject|cancel/i.test(message)) return "You cancelled in your wallet.";
  if (/linked|TurboModuleRegistry|could not be found/i.test(message)) return "This version of Spot can't open wallets. Update the app.";
  return "Your wallet didn't answer. Try again.";
}
