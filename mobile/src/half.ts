import AsyncStorage from "@react-native-async-storage/async-storage";
import { errorLine, tp, type Answer, type ApiError, type JupOrder, type JupSession } from "./api";
import { bytesToBase58 } from "./wallet/base58";
import { inWallet, walletError, type WalletAsk } from "./wallet/mwa";

/**
 * SELL HALF AT 2X, through Jupiter's trigger orders (via /api/tp, which
 * holds Spot's Jupiter key). The coins to sell go from the wallet into the
 * wallet's vault at Jupiter, a custodial account Jupiter runs, and Jupiter
 * sells them for USDC when the price reaches the mark; the USDC comes back
 * to the wallet. Spot holds no key and no coin.
 *
 * A wallet signs in to Jupiter once, with a message; a refresh token kept
 * here renews the session after, so most 2x sells are one approval: the
 * deposit. When a sign-in is needed, it and the deposit are two approvals
 * in one wallet opening (inWallet).
 */

const KEY = (owner: string) => `spot:jup:${owner}`;

interface Kept {
  session: JupSession | null;
  /** Jupiter has made this wallet its vault. */
  vault: boolean;
}

async function kept(owner: string): Promise<Kept> {
  try {
    const raw = await AsyncStorage.getItem(KEY(owner));
    const v = raw ? (JSON.parse(raw) as Partial<Kept>) : {};
    return { session: v.session ?? null, vault: v.vault === true };
  } catch {
    return { session: null, vault: false };
  }
}

async function keep(owner: string, k: Kept): Promise<void> {
  await AsyncStorage.setItem(KEY(owner), JSON.stringify(k)).catch(() => {});
}

/** The wallet's Jupiter session, good for the next minute: as kept, or renewed. Null when the wallet has to sign in again. */
async function sessionOf(owner: string): Promise<JupSession | null> {
  const k = await kept(owner);
  const s = k.session;
  if (!s) return null;
  if (Date.parse(s.expiresAt) - Date.now() > 60_000) return s;
  const r = await tp.refresh(s.refreshToken);
  if (!r.ok) {
    /* An ended session is forgotten; anything else (no network) keeps it for the next try. */
    if (r.error === "signed_out" || r.error === "bad") await keep(owner, { ...k, session: null });
    return null;
  }
  const next = { accessToken: r.value.accessToken, refreshToken: r.value.refreshToken, expiresAt: r.value.expiresAt };
  await keep(owner, { ...k, session: next });
  return next;
}

class Stop extends Error {
  constructor(readonly line: string) {
    super(line);
  }
}

const stopOn = <T>(a: Answer<T>): T => {
  if (a.ok) return a.value;
  throw new Stop(a.error === "refused" && typeof a.detail?.message === "string" ? `Jupiter said no: ${a.detail.message}` : errorLine(a.error as ApiError));
};

/** Signing in inside a wallet opening, with the message Jupiter gave before it opened. */
async function signIn(owner: string, ask: WalletAsk, challenge: string): Promise<JupSession> {
  const signature = await ask.signMessage(new TextEncoder().encode(challenge));
  const s = stopOn(await tp.verify(owner, bytesToBase58(signature)));
  const session = { accessToken: s.accessToken, refreshToken: s.refreshToken, expiresAt: s.expiresAt };
  await keep(owner, { ...(await kept(owner)), session });
  return session;
}

/* The steps that need a session, with one: inside the wallet opening when a sign-in was needed. */
async function withSession<T>(
  wallet: { address: string; authToken: string },
  steps: (session: JupSession, ask: WalletAsk) => Promise<T>,
): Promise<{ value: T; session: JupSession; authToken: string }> {
  const owner = wallet.address;
  let session = await sessionOf(owner);
  const challenge = session ? null : stopOn(await tp.challenge(owner)).challenge;
  const opened = await inWallet(owner, wallet.authToken, async (ask) => {
    session ??= await signIn(owner, ask, challenge!);
    return steps(session, ask);
  });
  return { value: opened.value, session: session!, authToken: opened.authToken };
}

export type Done<T> = { ok: true; value: T; authToken: string } | { ok: false; line: string };

const failed = (e: unknown): { ok: false; line: string } => ({ ok: false, line: e instanceof Stop ? e.line : walletError(e) });

/** Thirty days, as Jupiter suggests; every order needs an end. */
export const HALF_DAYS = 30;

/** Puts half into Jupiter's vault to sell at the price given. */
export async function placeHalf(
  wallet: { address: string; authToken: string },
  plan: { mint: string; raw: string; priceUsd: number },
): Promise<Done<{ id: string; expiresAt: number }>> {
  const owner = wallet.address;
  try {
    const opened = await withSession(wallet, async (session, ask) => {
      if (!(await kept(owner)).vault) {
        stopOn(await tp.vault(session.accessToken));
        await keep(owner, { ...(await kept(owner)), vault: true });
      }
      const deposit = stopOn(await tp.deposit(session.accessToken, { inputMint: plan.mint, userAddress: owner, amount: plan.raw }));
      return { requestId: deposit.requestId, signed: await ask.signTransaction(deposit.transaction) };
    });
    const expiresAt = Date.now() + HALF_DAYS * 86_400_000;
    const order = stopOn(
      await tp.order(opened.session.accessToken, {
        depositRequestId: opened.value.requestId,
        depositSignedTx: opened.value.signed,
        userPubkey: owner,
        inputMint: plan.mint,
        inputAmount: plan.raw,
        triggerPriceUsd: plan.priceUsd,
        expiresAt,
      }),
    );
    return { ok: true, value: { id: order.id, expiresAt }, authToken: opened.authToken };
  } catch (e) {
    return failed(e);
  }
}

/** Takes the coins back from the vault: the 2x sell cancelled, or one that ran out. */
export async function takeBack(wallet: { address: string; authToken: string }, orderId: string): Promise<Done<{ signature: string }>> {
  try {
    const opened = await withSession(wallet, async (session, ask) => {
      const c = stopOn(await tp.cancel(session.accessToken, orderId));
      return { requestId: c.requestId, signed: await ask.signTransaction(c.transaction) };
    });
    const done = stopOn(await tp.confirmCancel(opened.session.accessToken, { orderId, signedTransaction: opened.value.signed, cancelRequestId: opened.value.requestId }));
    return { ok: true, value: { signature: done.txSignature }, authToken: opened.authToken };
  } catch (e) {
    return failed(e);
  }
}

/** Jupiter's word on this wallet's 2x sells, when a session is at hand without asking the wallet; null otherwise. */
export async function readHalves(owner: string): Promise<JupOrder[] | null> {
  const session = await sessionOf(owner);
  if (!session) return null;
  const [active, past] = await Promise.all([tp.orders(session.accessToken, "active"), tp.orders(session.accessToken, "past")]);
  if (!active.ok || !past.ok) return null;
  return [...active.value.orders, ...past.value.orders];
}
