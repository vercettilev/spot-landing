import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { readHalves } from "../half";
import { forgetHoldings } from "../holdings";
import { halfFate } from "../logic";
import { books, saleGain } from "../pnl";
import { useStore } from "../store";
import { celebrate } from "./Moment";

const EVERY_MS = 60_000;

/**
 * WHERE A 2X SELL'S END LANDS, wherever the user is: Jupiter is asked about
 * the wallet's 2x sells when the app comes to the front and each minute
 * while it stays there, as long as one is waiting. One that sold is a sale
 * (the moment, the trade in the book); one that ran out waits to be taken
 * back from the coin's page; one taken back elsewhere is gone. Asking needs
 * the wallet's Jupiter session; without one it waits for the next sign-in.
 * Mounted once, beside TradeWatch.
 */
export function HalfWatch() {
  const store = useStore();
  const latest = useRef(store);
  latest.current = store;
  const asking = useRef(false);

  useEffect(() => {
    const look = async () => {
      const s = latest.current;
      const owner = s.wallet?.kind === "mwa" ? s.wallet.address : null;
      const mine = s.halves.filter((h) => h.owner === owner && h.state === "open");
      if (!owner || !mine.length || asking.current) return;
      asking.current = true;
      try {
        const orders = await readHalves(owner);
        if (!orders) return;
        for (const h of mine) {
          const o = orders.find((x) => x.id === h.id);
          if (!o) continue;
          const fate = halfFate(o, h.decimals);
          const now = latest.current;
          if (fate.state === "sold") {
            const amount = fate.amount || h.amount;
            const usdc = fate.usdc || h.back;
            const gain = saleGain(books(now.trades.filter((t) => t.owner === owner)).get(h.mint), amount, usdc);
            now.addTrade({ id: `half-${h.id}`, at: new Date().toISOString(), owner, mint: h.mint, symbol: h.symbol, icon: h.icon, side: "sell", usdc, amount, exact: fate.usdc > 0, signature: null });
            now.addActivity({ kind: "sell", mint: h.mint, symbol: h.symbol, text: `Sold half of $${h.symbol} at 2x`, signature: null });
            now.dropHalf(h.id);
            forgetHoldings(owner);
            celebrate({ kind: "sell", symbol: h.symbol, usdc, amount, gain });
          } else if (fate.state === "expired") {
            now.putHalf({ ...h, state: "expired" });
          } else if (fate.state === "gone") {
            now.dropHalf(h.id);
            forgetHoldings(owner);
          }
        }
      } finally {
        asking.current = false;
      }
    };
    void look();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void look();
    }, EVERY_MS);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void look();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return null;
}
