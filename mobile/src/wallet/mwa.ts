import { Platform } from "react-native";
import { toAddress } from "./base58";

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

export async function connectWallet(): Promise<Connected> {
  return load().transact(async (wallet) => {
    const auth = await wallet.authorize({ chain: CHAIN, identity: IDENTITY });
    const account = auth.accounts[0];
    if (!account) throw new Error("The wallet shared no account.");
    return {
      address: toAddress(account.address),
      label: ("label" in account && typeof account.label === "string" ? account.label : null) ?? null,
      authToken: auth.auth_token,
      walletUriBase: auth.wallet_uri_base ?? null,
    };
  });
}

/** One transaction, signed by the wallet (not sent: Jupiter lands it). */
export async function signTransaction(transaction: string, authToken: string | null): Promise<{ signed: string; authToken: string }> {
  return load().transact(async (wallet) => {
    const auth = await wallet.authorize({ chain: CHAIN, identity: IDENTITY, ...(authToken ? { auth_token: authToken } : {}) });
    const { signed_payloads } = await wallet.signTransactions({ payloads: [transaction] });
    const signed = signed_payloads[0];
    if (!signed) throw new Error("The wallet returned nothing to send.");
    return { signed, authToken: auth.auth_token };
  });
}

/** Why a wallet session ended without an answer, in words. */
export function walletError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  const message = String((e as Error)?.message ?? "");
  if (code === "ERROR_WALLET_NOT_FOUND") return "No Solana wallet on this phone. Install Phantom or Solflare, or use Seed Vault on a Seeker.";
  if (code === "ERROR_ASSOCIATION_CANCELLED" || /declin|reject|cancel/i.test(message)) return "Cancelled in the wallet.";
  if (/linked|TurboModuleRegistry|could not be found/i.test(message)) return "This build of Spot can't reach wallets. Update the app.";
  return "The wallet didn't answer. Try again.";
}
