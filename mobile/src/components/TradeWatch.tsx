import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { USDC_MINT } from "../api";
import { cashIn } from "../cashIn";
import { cashInLine } from "../logic";
import { isClaimed, restore, subscribe } from "../pending";
import { useStore } from "../store";
import { books, saleGain } from "../pnl";
import { fateLine } from "../trade";
import { celebrate } from "./Moment";
import { feel, useToast } from "./ui";

/**
 * WHERE A TRADE'S VERDICT LANDS once the user has moved on: whichever
 * screen is up gets the toast, the activity its line, the coin its watch,
 * as if they had stayed. A coin screen that is showing says it itself
 * (claim, in pending.ts). Mounted once, over the navigator.
 */
export function TradeWatch() {
  const store = useStore();
  const latest = useRef(store);
  latest.current = store;
  const insets = useSafeAreaInsets();
  const [toastNode, toast] = useToast(80 + insets.bottom);

  useEffect(() => {
    void restore();
    return subscribe((p, fate, fill) => {
      if (!fate) return;
      const s = latest.current;
      /* Turning SOL into cash is not a trade: no book, no watch, no moment, just the word. */
      if (p.mint === USDC_MINT) {
        if (fate === "landed") {
          cashIn(p.quote.usdc);
          toast(cashInLine(p.quote.usdc));
        } else if (!isClaimed(p.owner, p.mint)) toast(fateLine(p, fate));
        return;
      }
      if (fate === "landed") {
        const f = fill ?? { ...p.quote, exact: false };
        if (!p.landed) {
          const gain = p.side === "sell" ? saleGain(books(s.trades.filter((t) => t.owner === p.owner)).get(p.mint), f.amount, f.usdc) : null;
          celebrate({ kind: p.side === "buy" ? "ape" : "sell", symbol: p.token.symbol, usdc: f.usdc, amount: f.amount, gain });
        }
        s.addTrade({
          id: p.signature ?? `${p.owner}-${p.mint}-${p.until}`,
          at: new Date().toISOString(),
          owner: p.owner,
          mint: p.mint,
          symbol: p.token.symbol,
          icon: p.token.icon,
          side: p.side,
          usdc: f.usdc,
          amount: f.amount,
          exact: f.exact,
          signature: p.signature,
        });
      }
      /* A trade that had landed was announced when it did; only the bag was waited for. */
      if (p.landed) return;
      if (fate === "landed") {
        s.addActivity({ kind: p.side === "buy" ? "ape" : "sell", mint: p.mint, symbol: p.token.symbol, text: p.text, signature: p.signature });
        if (p.side === "buy" && !s.isWatched(p.mint)) s.toggleWatch(p.token);
        return;
      }
      if (fate === "lost") feel("error");
      if (!isClaimed(p.owner, p.mint)) toast(fateLine(p, fate));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return toastNode;
}
