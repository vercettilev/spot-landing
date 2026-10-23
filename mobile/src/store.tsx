import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setHaptics } from "./components/ui";
import type { Trade } from "./pnl";
import type { Level, Sniff, TokenCard } from "./types";
import { homeOf, keepHomes, rememberWallet } from "./wallet/mwa";

/**
 * WHAT THE APP REMEMBERS, on the phone and nowhere else: settings, the coins
 * sniffed, the ones watched, what happened, and which wallet is connected
 * (its public address only; keys stay in the wallet app).
 */

export interface Settings {
  defaultAmount: number;
  /** After an ape, offer to sell half at 2x (src/half.ts). */
  tpDefault: boolean;
  /** The issuer of a tokenized stock does not sell to US persons; this hides the buy. */
  usPerson: boolean;
  /** The user has said whether they are in the US (asked once, on the first coin it matters for). */
  usAsked: boolean;
  haptics: boolean;
  /** When this phone first opened Spot. */
  since: string;
  /** Posts and screenshots shared to Spot so far: Home's how-to-share hint goes after a few. */
  shares: number;
}

export interface SniffRecord {
  mint: string;
  token: TokenCard;
  level: Level;
  headline: string;
  at: string;
}

export type AlertKind = "dev" | "liquidity" | "tp";

export interface WatchItem {
  mint: string;
  symbol: string;
  name: string;
  icon: string | null;
  alerts: Record<AlertKind, boolean>;
  since: string;
}

export interface ActivityItem {
  id: string;
  kind: "sniff" | "ape" | "sell" | "watch" | "connect";
  mint: string | null;
  symbol: string | null;
  text: string;
  at: string;
  signature?: string | null;
}

/**
 * A 2x sell placed through Jupiter (src/half.ts): half the coins Spot bought
 * in Jupiter's vault, sold for USDC when the price reaches twice what they
 * cost. Kept on the phone so the coin's page can say so without asking
 * Jupiter; its state is Jupiter's, read again when it can be.
 */
export interface Half {
  /** Jupiter's order id. */
  id: string;
  owner: string;
  mint: string;
  symbol: string;
  icon: string | null;
  decimals: number;
  /** Coins in the vault. */
  amount: number;
  raw: string;
  /** The price it sells at. */
  priceUsd: number;
  /** Dollars it brings back when it sells. */
  back: number;
  at: string;
  expiresAt: number;
  state: "open" | "expired" | "cancelling";
}

export type Wallet =
  | { kind: "mwa"; address: string; label: string | null; authToken: string; walletUriBase: string | null }
  | { kind: "watch"; address: string; label: null };

interface State {
  settings: Settings;
  history: SniffRecord[];
  watch: WatchItem[];
  activity: ActivityItem[];
  /** Every trade made through Spot, newest first (see pnl.ts). */
  trades: Trade[];
  /** 2x sells waiting in Jupiter's vault, or ended there and not taken back yet. */
  halves: Half[];
  wallet: Wallet | null;
}

const KEY = {
  settings: "spot:settings",
  history: "spot:history",
  watch: "spot:watch",
  activity: "spot:activity",
  trades: "spot:trades",
  halves: "spot:halves",
  wallet: "spot:wallet",
} as const;

const fresh = (): State => ({
  settings: { defaultAmount: 25, tpDefault: true, usPerson: false, usAsked: false, haptics: true, since: new Date().toISOString(), shares: 0 },
  history: [],
  watch: [],
  activity: [],
  trades: [],
  halves: [],
  wallet: null,
});

const MAX_HISTORY = 100;
const MAX_ACTIVITY = 200;
const MAX_TRADES = 500;

interface Store extends State {
  ready: boolean;
  setSettings: (patch: Partial<Settings>) => void;
  recordSniff: (sniff: Sniff) => void;
  isWatched: (mint: string) => boolean;
  toggleWatch: (token: TokenCard) => void;
  setAlert: (mint: string, kind: AlertKind, on: boolean) => void;
  addActivity: (item: Omit<ActivityItem, "id" | "at">) => void;
  addTrade: (trade: Trade) => void;
  /** A 2x sell placed, or changed: kept by its id. */
  putHalf: (half: Half) => void;
  /** A 2x sell that sold, or came back: gone from the coin's page. */
  dropHalf: (id: string) => void;
  setWallet: (wallet: Wallet | null) => void;
}

const Ctx = createContext<Store | null>(null);

function parse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...(fallback as object), ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

function parseList<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(fresh);
  const [ready, setReady] = useState(false);
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    AsyncStorage.multiGet(Object.values(KEY))
      .then((rows) => {
        const got = Object.fromEntries(rows);
        const base = fresh();
        const settings = parse(got[KEY.settings], base.settings);
        const wallet = got[KEY.wallet] ? (JSON.parse(got[KEY.wallet]!) as Wallet | null) : null;
        if (wallet?.kind === "mwa") rememberWallet(wallet.address, wallet.walletUriBase ?? null);
        setState({
          settings,
          history: parseList<SniffRecord>(got[KEY.history]),
          watch: parseList<WatchItem>(got[KEY.watch]),
          activity: parseList<ActivityItem>(got[KEY.activity]),
          trades: parseList<Trade>(got[KEY.trades]),
          halves: parseList<Half>(got[KEY.halves]),
          wallet,
        });
        if (!got[KEY.settings]) void AsyncStorage.setItem(KEY.settings, JSON.stringify(settings)).catch(() => {});
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => setHaptics(state.settings.haptics), [state.settings.haptics]);

  const save = useCallback(<K extends keyof State>(key: K, value: State[K]) => {
    /* Known to the next write in the same tick, not only after the render:
       an ape's activity line followed by its watch's used to lose the first. */
    latest.current = { ...latest.current, [key]: value };
    setState((s) => ({ ...s, [key]: value }));
    void AsyncStorage.setItem(KEY[key], JSON.stringify(value)).catch(() => {});
  }, []);

  /* Where the connected wallet asked to be found, kept as the wallet bridge last heard it. */
  useEffect(() => {
    keepHomes((address, home) => {
      const w = latest.current.wallet;
      if (w?.kind === "mwa" && w.address === address && w.walletUriBase !== home) save("wallet", { ...w, walletUriBase: home });
    });
    return () => keepHomes(null);
  }, [save]);

  const addActivity = useCallback(
    (item: Omit<ActivityItem, "id" | "at">) => {
      const at = new Date().toISOString();
      const next = [{ ...item, id: `${at}-${Math.random().toString(36).slice(2, 8)}`, at }, ...latest.current.activity].slice(0, MAX_ACTIVITY);
      save("activity", next);
    },
    [save],
  );

  const store = useMemo<Store>(() => {
    const s = state;
    return {
      ...s,
      ready,
      setSettings: (patch) => save("settings", { ...latest.current.settings, ...patch }),
      recordSniff: (sniff) => {
        const record: SniffRecord = {
          mint: sniff.mint,
          token: sniff.token,
          level: sniff.level,
          headline: sniff.headline,
          at: sniff.checkedAt,
        };
        save("history", [record, ...latest.current.history.filter((h) => h.mint !== sniff.mint)].slice(0, MAX_HISTORY));
      },
      isWatched: (mint) => s.watch.some((w) => w.mint === mint),
      toggleWatch: (token) => {
        const watched = latest.current.watch.some((w) => w.mint === token.mint);
        if (watched) {
          save("watch", latest.current.watch.filter((w) => w.mint !== token.mint));
          return;
        }
        const item: WatchItem = {
          mint: token.mint,
          symbol: token.symbol,
          name: token.name,
          icon: token.icon,
          alerts: { dev: true, liquidity: true, tp: latest.current.settings.tpDefault },
          since: new Date().toISOString(),
        };
        save("watch", [item, ...latest.current.watch]);
        addActivity({ kind: "watch", mint: token.mint, symbol: token.symbol, text: `Watching $${token.symbol}` });
      },
      setAlert: (mint, kind, on) =>
        save(
          "watch",
          latest.current.watch.map((w) => (w.mint === mint ? { ...w, alerts: { ...w.alerts, [kind]: on } } : w)),
        ),
      addActivity,
      addTrade: (trade) => {
        if (latest.current.trades.some((t) => t.id === trade.id)) return;
        save("trades", [trade, ...latest.current.trades].slice(0, MAX_TRADES));
      },
      putHalf: (half) => save("halves", [half, ...latest.current.halves.filter((h) => h.id !== half.id)]),
      dropHalf: (id) => save("halves", latest.current.halves.filter((h) => h.id !== id)),
      setWallet: (wallet) => {
        /* The bridge knows the wallet's home best: a renewed token arrives with the home it had. */
        save("wallet", wallet?.kind === "mwa" ? { ...wallet, walletUriBase: homeOf(wallet.address) } : wallet);
        if (wallet) addActivity({ kind: "connect", mint: null, symbol: null, text: wallet.kind === "mwa" ? "Wallet connected" : "Tracking a wallet" });
      },
    };
  }, [state, ready, save, addActivity]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStore outside StoreProvider");
  return store;
}
