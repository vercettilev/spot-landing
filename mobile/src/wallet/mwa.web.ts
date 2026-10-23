/* The web build is for looking at screens: no wallet app to talk to. */

export const MWA_AVAILABLE = false;

export interface Connected {
  address: string;
  label: string | null;
  authToken: string;
  walletUriBase: string | null;
}

export async function connectWallet(): Promise<Connected> {
  throw Object.assign(new Error("No wallet adapter on the web."), { code: "ERROR_WALLET_NOT_FOUND" });
}

export async function signTransaction(_transaction: string, _authToken: string | null, _address: string): Promise<{ signed: string; authToken: string }> {
  throw Object.assign(new Error("No wallet adapter on the web."), { code: "ERROR_WALLET_NOT_FOUND" });
}

export interface WalletAsk {
  signMessage(message: Uint8Array): Promise<Uint8Array>;
  signTransaction(transaction: string): Promise<string>;
}

export async function inWallet<T>(_address: string, _authToken: string | null, _steps: (ask: WalletAsk) => Promise<T>): Promise<{ value: T; authToken: string }> {
  throw Object.assign(new Error("No wallet adapter on the web."), { code: "ERROR_WALLET_NOT_FOUND" });
}

export function rememberWallet(_address: string, _walletUriBase: string | null): void {}

export const homeOf = (_address: string): string | null => null;

export function keepHomes(_listener: ((address: string, home: string | null) => void) | null): void {}

export function walletError(): string {
  return "Wallets connect in the Android app.";
}
