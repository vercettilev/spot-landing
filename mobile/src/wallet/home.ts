/**
 * WHERE A WALLET ASKED TO BE FOUND AGAIN. A wallet may answer Spot's connect
 * with its own address for later sessions (MWA's wallet_uri_base). A session
 * opened there goes straight to that wallet, where otherwise Android asks
 * which wallet app to use whenever the phone has more than one. Kept apart
 * from mwa.ts so it can be tested without a phone.
 */

/* The protocol takes only an absolute https address, with no query or fragment. */
const HOME = /^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[^\s?#]*)?$/;

/** A wallet's address for later sessions, or null when it gave none the protocol can use. */
export function walletHome(uri: string | null | undefined): string | null {
  return uri && HOME.test(uri) ? uri : null;
}

/**
 * ONE WALLET SESSION, at the wallet's home when it has one. If that wallet
 * never answered (uninstalled, its link went to a browser, or it was closed
 * before it could), the home is forgotten and the next session goes through
 * Android's own pick. Nothing is opened again on its own: the error can't
 * tell a missing wallet from one its owner backed out of.
 */
export async function sessionAt<W, T>(
  transact: (session: (wallet: W) => Promise<T>, config?: { baseUri: string }) => Promise<T>,
  home: string | null,
  session: (wallet: W) => Promise<T>,
  lost: () => void,
): Promise<T> {
  let answered = false;
  const run = (wallet: W) => {
    answered = true;
    return session(wallet);
  };
  try {
    return await transact(run, home ? { baseUri: home } : undefined);
  } catch (e) {
    if (home && !answered) lost();
    throw e;
  }
}
