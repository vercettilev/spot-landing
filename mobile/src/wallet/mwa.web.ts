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

export function walletError(): string {
  return "Wallets connect in the Android app.";
}
