import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { executeOrder, fetchHoldings, placeOrder, sniffCoin } from "../api";
import { celebrate } from "../components/Moment";
import { SniffReport, type SniffState } from "../components/SniffReport";
import { Button, CoinFace, Dock, IconButton, Keypad, OutIcon, Pill, Segmented, Sheet, Toggle, Verified, feel, tap, useToast, type SheetHandle } from "../components/ui";
import { forgetHoldings, useHoldings } from "../holdings";
import {
  DEFAULT_AMOUNT,
  MAX_TRADE,
  chipsFor,
  clampAmount,
  dockKey,
  dockNote,
  holding,
  maxApe,
  needsCash as shortOfCash,
  padHint,
  pct,
  price,
  shareFor,
  shareOf,
  sourceLine,
  typeDigit,
  usd,
  type DockState,
} from "../logic";
import type { RootParams } from "../navigation";
import { claim, hold, pendingFor, subscribe } from "../pending";
import { books, saleGain, since, sinceAped } from "../pnl";
import { AUTO_SELL } from "../soon";
import { useStore, type Wallet } from "../store";
import { color, font, leading, radius, size, space, tracking, type } from "../theme";
import { LAND_WINDOW_MS, SETTLE_MS, failedLine, fateLine, orderErrorLine, quoteUsd, secondsLeft, settled, shortFill, snapshotOf, type Pending, type Side, type Snapshot } from "../trade";
import type { Order } from "../types";
import { short } from "../wallet/base58";
import { signTransaction, walletError } from "../wallet/mwa";

type Props = NativeStackScreenProps<RootParams, "Coin">;

const SELL_SHARES = [25, 50, 100];

const SIDES = [
  { value: "buy", label: "Buy", tint: color.green, ink: color.ink },
  { value: "sell", label: "Sell", tint: color.red, ink: color.white },
] as const;

/** A quote that pays much less than the price says, waiting for a yes. */
interface Confirm {
  order: Order;
  side: Side;
  before: Snapshot | null;
  text: string;
  builtAt: number;
  quote: { usdc: number; amount: number };
  line: string;
  label: string;
}

/* Raw base units, in whole coins or dollars. */
const units = (raw: string, decimals: number) => (/^\d+$/.test(raw) ? Number(raw) / 10 ** decimals : 0);

/* A quote on a thin pool goes stale fast: after this, a yes asks for a new one. */
const CONFIRM_FRESH_MS = 25_000;

/**
 * A COIN, in the order a first-timer needs it: what it is, the stamp
 * (CLEAN, GRRR or NOPE) and the proof under it, then the dock at the
 * bottom: how much and the key, so a buy is one tap from the share. Any
 * amount can be typed on the keypad. When the wallet holds the coin the
 * dock gets Buy and Sell (opened from the bag, it starts on Sell), and
 * Sell stays open on a coin Spot blocks: Spot refuses the buy, never the
 * way out of a bag already held.
 *
 * A trade goes through the wallet on the phone (Seed Vault, Phantom): Spot
 * asks the server for an order, the wallet asks its owner to approve it,
 * Jupiter lands it. Until the server opens trading, the key says so.
 *
 * Money rules (trade.ts): one trade at a time, however fast the taps; a
 * quote far below the price stops for a yes before the wallet opens; and a
 * trade whose fate is not known locks the key, with a countdown, while
 * pending.ts watches the wallet, so "did it go through?" can never become
 * a second buy. The user may leave: the verdict follows them.
 */
export function CoinScreen({ navigation, route }: Props) {
  const { candidate, source, share, others } = route.params;
  const store = useStore();
  const [dockHeight, setDockHeight] = useState<number>(size.key * 3);
  const [toastNode, toast] = useToast(dockHeight + space.x2);
  const [sniff, setSniff] = useState<SniffState>({ status: "loading" });
  const [side, setSide] = useState<"buy" | "sell">(route.params.side ?? "buy");
  const [preset, setPreset] = useState(store.settings.defaultAmount || DEFAULT_AMOUNT);
  /* Dollars typed on the keypad, digits only. */
  const [custom, setCustom] = useState("");
  const [sellPreset, setSellPreset] = useState(50);
  /* Dollars of the holding typed on the keypad, sold as the share of it they are. */
  const [sellCustom, setSellCustom] = useState("");
  const [tp, setTp] = useState(store.settings.tpDefault);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [pad, setPad] = useState(false);
  /* The keypad refused the last digit: more than this coin or the server allows. */
  const [over, setOver] = useState(false);
  const padRef = useRef<SheetHandle>(null);
  const inFlight = useRef(false);
  const run = useRef(0);

  const wallet = store.wallet;
  const owner = wallet?.address ?? null;
  const mint = candidate.token.mint;
  const [checking, setChecking] = useState<Pending | null>(() => pendingFor(owner, mint));
  const [now, setNow] = useState(() => Date.now());
  const focused = useIsFocused();
  const focusedRef = useRef(focused);
  focusedRef.current = focused;
  const bag = useHoldings(wallet?.address ?? null);
  const done = sniff.status === "done" ? sniff.sniff : null;
  const coin = done?.token ?? candidate.token;
  const position = bag.value?.positions.find((p) => p.token.mint === coin.mint) ?? null;

  const sniffNow = useCallback(async () => {
    const id = ++run.current;
    setSniff({ status: "loading" });
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await sniffCoin(candidate.token.mint, DEFAULT_AMOUNT);
      if (id !== run.current) return;
      if (!res.ok) {
        setSniff({ status: "error", error: res.error });
        return;
      }
      if (res.value.level !== "unknown" || attempt === 1) {
        setSniff({ status: "done", sniff: res.value });
        store.recordSniff(res.value);
        if (res.value.level === "warn" && res.value.maxBuyUsdc !== null) setPreset((a) => clampAmount(a, res.value.maxBuyUsdc));
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.token.mint]);

  useEffect(() => {
    void sniffNow();
    return () => {
      run.current++;
    };
  }, [sniffNow]);

  /* Sold the last of it: back to buying, once the bag has been read. */
  useEffect(() => {
    if (bag.value && !position && side === "sell") setSide("buy");
  }, [bag.value, position, side]);

  /* The hold on this coin and, when it comes, the verdict, from the
     watcher in pending.ts. Said here while this screen is the one showing;
     elsewhere TradeWatch says it. */
  useEffect(() => {
    setChecking(pendingFor(owner, mint));
    return subscribe((p, fate) => {
      if (p.owner !== owner || p.mint !== mint) return;
      setChecking(fate ? null : p);
      /* A landed trade gets the moment, from Moment.tsx; the rest a word here. */
      if (fate && fate !== "landed" && !p.landed && focusedRef.current) toast(fateLine(p, fate));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, mint]);

  useEffect(() => {
    if (!focused || !owner) return;
    return claim(owner, mint);
  }, [focused, owner, mint]);

  /* The countdown on the locked button. */
  useEffect(() => {
    if (!checking || checking.landed) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [checking]);

  const buying = side === "buy";
  const restricted = store.settings.usPerson && coin.restrictions.includes("us-persons");
  const cap = done?.level === "warn" ? done.maxBuyUsdc : null;
  const chips = chipsFor(cap);
  /* A typed amount wins over the chips, within the server's $1 to $10,000 and a warned coin's cap. */
  const typed = custom ? clampAmount(Math.min(MAX_TRADE, Math.max(1, Number(custom))), cap) : null;
  const amount = typed ?? preset;
  const up = (coin.change24hPct ?? 0) >= 0;
  const sellTyped = sellCustom && position ? shareFor(Number(sellCustom), position.usd) : 0;
  const sellPct = sellTyped > 0 ? sellTyped : sellPreset;
  const sellUsd = position ? Math.round(position.usd * sellPct) / 100 : 0;
  const canPickAmount = buying ? Boolean(done) && (done!.level === "ok" || done!.level === "warn") && !restricted : Boolean(position);
  /* Spot apes in dollars. Short of them, the one thing to do is add cash. */
  const cash = bag.value?.usdc.usd ?? null;
  const solCovers = bag.value !== null && (bag.value.sol.usd ?? 0) - 1 >= amount;
  const dock: DockState = {
    side,
    sniff: sniff.status === "done" ? sniff.sniff.level : sniff.status === "error" ? "error" : "loading",
    amount,
    wallet: wallet?.kind ?? "none",
    cash,
    solCovers,
    restricted,
    busy,
    checking: checking ? { landed: checking.landed, seconds: secondsLeft(checking, now) } : null,
    held: position?.usd ?? null,
    sellPct,
  };
  const needsCash = shortOfCash(dock);
  const action = dockKey(dock);
  const note = dockNote(dock);
  /* What the coins Spot bought are worth now, against what they cost. */
  const book = owner ? books(store.trades.filter((t) => t.owner === owner)).get(coin.mint) : undefined;
  const gained = book && position ? since(book, position) : null;

  /* The keypad: dollars to ape, or dollars of the holding to sell. */
  const padValue = buying ? custom : sellCustom;
  const padMax = buying ? Math.min(MAX_TRADE, cap ?? MAX_TRADE) : Math.ceil(position?.usd ?? 0);
  const padAction = dockKey({ ...dock, empty: !padValue });
  const most = buying ? maxApe(wallet?.kind === "mwa" ? cash : null, cap) : null;
  const hint = padHint({ side, typed: padValue ? Number(padValue) : null, over, cap, cash: wallet?.kind === "mwa" ? cash : null, held: position?.usd ?? null });

  function openPad() {
    setOver(false);
    setPad(true);
  }

  function digit(d: string) {
    const { next, over: refused } = typeDigit(padValue, d, padMax);
    setOver(refused);
    if (refused) {
      feel("warning");
      return;
    }
    if (buying) setCustom(next);
    else setSellCustom(next);
  }

  function setPadValue(v: string) {
    setOver(false);
    if (buying) setCustom(v);
    else setSellCustom(v);
  }

  /* Connecting or adding cash rises as a sheet over the coin, told what the
     ape is for; everything else is the trade. */
  function act() {
    if (buying && !wallet && canPickAmount) {
      navigation.navigate("Connect", { ape: amount });
      return;
    }
    if (needsCash) {
      navigation.navigate("Deposit", { need: amount });
      return;
    }
    void trade();
  }

  /* The keypad's key does what the dock's does, once the sheet is down. */
  function padGo() {
    padRef.current?.close(() => {
      setPad(false);
      act();
    });
  }

  async function copyCa() {
    tap();
    await Clipboard.setStringAsync(coin.mint).catch(() => {});
    toast("CA copied.");
  }

  async function trade() {
    if (inFlight.current || checking) return;
    if (buying && (sniff.status === "error" || done?.level === "unknown")) {
      void sniffNow();
      return;
    }
    if (!wallet) {
      navigation.navigate("Connect");
      return;
    }
    if (wallet.kind !== "mwa") {
      toast("You're only tracking this wallet. Connect your own wallet to trade.");
      return;
    }
    if (needsCash) {
      navigation.navigate("Deposit");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      /* The wallet as it is right now, read while the order is built: what
         a trade that may still land is checked against. */
      const sellRaw = shareOf(position?.raw ?? "0", sellPct);
      const [order, fresh] = await Promise.all([
        placeOrder(
          buying
            ? { mint: coin.mint, side, taker: wallet.address, amountUsdc: amount }
            : { mint: coin.mint, side, taker: wallet.address, amountRaw: sellRaw },
        ),
        fetchHoldings(wallet.address),
      ]);
      if (!order.ok) {
        toast(orderErrorLine(order.error, order.detail, side));
        return;
      }
      const builtAt = Date.now();
      const before = snapshotOf(fresh.ok ? fresh.value : bag.value, coin.mint);
      const text = buying
        ? `Aped $${amount} of $${coin.symbol}${AUTO_SELL && tp ? ". Half sells at 2x" : ""}`
        : `Sold ${sellPct === 100 ? "all" : `${sellPct}%`} of $${coin.symbol}`;
      const quote = buying
        ? { usdc: amount, amount: units(order.value.outAmount, coin.decimals) }
        : { usdc: units(order.value.outAmount, 6), amount: units(sellRaw, coin.decimals) };
      const short = shortFill(buying ? amount : sellUsd, quoteUsd(side, order.value, coin));
      if (short) {
        feel("warning");
        setConfirm({
          order: order.value,
          side,
          before,
          text,
          builtAt,
          quote,
          line: buying
            ? `Thin pool. Your $${amount} only buys about ${usd(short.gotUsd)} of it.`
            : `Thin pool. You'd get ${usd(short.gotUsd)} back, not ${usd(short.expectedUsd)}.`,
          label: buying ? "Ape anyway" : `Sell for ${usd(short.gotUsd)}`,
        });
        return;
      }
      await send(wallet, order.value, side, before, text, builtAt, quote);
    } catch (e) {
      toast(walletError(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  /** A yes to a thin quote: sent as quoted, or asked for again once it is stale. */
  async function confirmed() {
    const c = confirm;
    if (!c || inFlight.current || !wallet || wallet.kind !== "mwa") return;
    setConfirm(null);
    if (Date.now() - c.builtAt > CONFIRM_FRESH_MS) {
      void trade();
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      await send(wallet, c.order, c.side, c.before, c.text, c.builtAt, c.quote);
    } catch (e) {
      toast(walletError(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function send(
    w: Extract<Wallet, { kind: "mwa" }>,
    order: Order,
    sideNow: Side,
    before: Snapshot | null,
    text: string,
    builtAt: number,
    quote: { usdc: number; amount: number },
  ) {
    const signed = await signTransaction(order.transaction, w.authToken, w.address);
    if (signed.authToken !== w.authToken) store.setWallet({ ...w, authToken: signed.authToken });
    const res = await executeOrder(order.requestId, signed.signed);
    const signature = res.ok ? res.value.signature : null;
    const held = { owner: w.address, mint: coin.mint, token: coin, side: sideNow, payWith: "usdc" as const, before, text, signature, quote };
    switch (settled(res)) {
      case "landed":
        finish(w.address, sideNow, text, signature, quote);
        /* Landed, but the next trade waits for the bag to show it. */
        hold({ ...held, landed: true, until: Date.now() + SETTLE_MS });
        return;
      case "failed":
        feel("error");
        toast(failedLine(res, sideNow));
        return;
      default:
        hold({ ...held, landed: false, until: builtAt + LAND_WINDOW_MS });
    }
  }

  function finish(walletAddress: string, sideNow: Side, text: string, signature: string | null, quote: { usdc: number; amount: number }) {
    forgetHoldings(walletAddress);
    store.addActivity({ kind: sideNow === "buy" ? "ape" : "sell", mint: coin.mint, symbol: coin.symbol, text, signature });
    if (sideNow === "buy" && !store.isWatched(coin.mint)) store.toggleWatch(coin);
    const gain = sideNow === "sell" ? saleGain(books(store.trades.filter((t) => t.owner === walletAddress)).get(coin.mint), quote.amount, quote.usdc) : null;
    celebrate({ kind: sideNow === "buy" ? "ape" : "sell", symbol: coin.symbol, usdc: quote.usdc, amount: quote.amount, gain });
  }

  return (
    <View style={styles.fill}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: dockHeight + space.x6 }]}
        keyboardShouldPersistTaps="handled"
        importantForAccessibility={pad ? "no-hide-descendants" : "auto"}
      >
        <View style={styles.top}>
          <IconButton icon="back" label="Back" onPress={() => navigation.goBack()} style={styles.back} />
          <Text style={styles.source} numberOfLines={1}>
            {source && share ? sourceLine(source, share) : ""}
          </Text>
        </View>

        <View style={styles.coin}>
          <CoinFace uri={coin.icon} symbol={coin.symbol} size={size.faceCoin} />
          <View style={styles.coinText}>
            <View style={styles.symbolRow}>
              <Text style={styles.symbol} numberOfLines={1}>
                ${coin.symbol}
              </Text>
              {coin.verified && <Verified />}
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {coin.kind === "stock" ? `${coin.name}, a stock coin` : coin.name}
            </Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.price}>{price(coin.priceUsd)}</Text>
            <Text style={[styles.change, { color: up ? color.green : color.red }]}>{pct(coin.change24hPct)}</Text>
          </View>
        </View>

        {coin.mcapUsd !== null && <Text style={styles.stats}>{usd(coin.mcapUsd)} market cap</Text>}
        {/* The address is the one thing a lookalike cannot copy: shown, copied in a tap, and checked on Solscan. */}
        <View style={styles.caRow}>
          <Pressable onPress={() => void copyCa()} accessibilityRole="button" accessibilityLabel="Copy the contract address" style={styles.ca}>
            <Text style={styles.caLabel}>CA</Text>
            <Text style={styles.caText}>{short(coin.mint)}</Text>
            <Text style={styles.caLink}>Copy</Text>
          </Pressable>
          <Pressable
            onPress={() => void Linking.openURL(`https://solscan.io/token/${coin.mint}`).catch(() => {})}
            accessibilityRole="link"
            accessibilityLabel="See it on Solscan"
            style={styles.ca}
          >
            <Text style={styles.caLink}>Solscan</Text>
            <OutIcon tint={color.orange} />
          </Pressable>
        </View>
        {coin.restrictions.includes("us-persons") && <Text style={styles.restricted}>Not sold to people in the US.</Text>}
        {others.length > 0 && (
          <Pressable
            onPress={() =>
              navigation.navigate("Choose", {
                title: "Not this one?",
                line: `Other coins in there${source && share ? `, ${sourceLine(source, share)}` : ""}.`,
                candidates: others,
                source,
                share,
                current: candidate,
              })
            }
            style={styles.notThis}
            accessibilityRole="button"
          >
            <Text style={styles.notThisText}>Not this one? See {others.length === 1 ? "the other coin" : `${others.length} others`}</Text>
          </Pressable>
        )}

        <View style={styles.report}>
          <SniffReport state={sniff} onRetry={() => void sniffNow()} />
        </View>

        {AUTO_SELL && buying && canPickAmount && (
          <View style={styles.tp}>
            <View style={styles.tpText}>
              <Text style={styles.tpTitle}>Never round-trip a 2x</Text>
              <Text style={styles.tpNote}>At 2x, Spot sells half: your ${amount} comes back and the rest rides free.</Text>
            </View>
            <Toggle value={tp} onChange={setTp} label="Sell half at 2x" />
          </View>
        )}
      </ScrollView>

      <Dock onHeight={setDockHeight}>
        <View importantForAccessibility={pad ? "no-hide-descendants" : "auto"}>
          {confirm ? (
            <>
              <Text style={styles.confirmLine}>{confirm.line}</Text>
              <View style={styles.pair}>
                <Button label="Cancel" kind="quiet" onPress={() => setConfirm(null)} style={styles.half} />
                <Button label={confirm.label} kind="growl" onPress={() => void confirmed()} style={styles.half} />
              </View>
              <Text style={styles.note}>Your wallet still asks before anything moves.</Text>
            </>
          ) : (
            <>
              {position && (
                <View style={styles.dockHead}>
                  <Segmented
                    label="Buy or sell"
                    options={SIDES}
                    value={side}
                    onChange={(s) => {
                      setSide(s);
                      setConfirm(null);
                    }}
                  />
                  <View style={styles.heldCol}>
                    <Text style={styles.held} numberOfLines={1}>
                      {holding(position.usd)}
                    </Text>
                    {gained ? (
                      <Text style={[styles.gained, { color: gained.usd >= 0 ? color.green : color.dim }]} numberOfLines={1}>
                        {sinceAped(gained)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}
              {canPickAmount && !checking && (
                <View style={styles.chips}>
                  {buying
                    ? chips.map((c) => (
                        <Pill
                          key={c}
                          label={`$${c}`}
                          on={!custom && c === amount}
                          onPress={() => {
                            setCustom("");
                            setPreset(c);
                          }}
                        />
                      ))
                    : SELL_SHARES.map((p) => (
                        <Pill
                          key={p}
                          label={p === 100 ? "All" : `${p}%`}
                          on={!sellCustom && p === sellPreset}
                          onPress={() => {
                            setSellCustom("");
                            setSellPreset(p);
                          }}
                        />
                      ))}
                  {buying || (position && position.usd > 0) ? (
                    <Pill
                      label={padValue ? `$${padValue}` : "Other"}
                      on={Boolean(padValue)}
                      onPress={openPad}
                      accessibilityLabel={padValue ? `$${padValue}, type another amount` : "Type an amount"}
                    />
                  ) : null}
                </View>
              )}
              <Button label={action.label} kind={action.tone} disabled={!action.enabled} onPress={act} />
              <Text style={styles.note}>{note}</Text>
            </>
          )}
        </View>
      </Dock>

      <Sheet ref={padRef} visible={pad} onDismiss={() => setPad(false)} title={buying ? "How much to ape?" : "How much to sell?"}>
        <Text style={[styles.figure, !padValue && styles.figureEmpty]} numberOfLines={1} adjustsFontSizeToFit accessibilityLiveRegion="polite">
          ${padValue || "0"}
        </Text>
        <Text style={[styles.padHint, over && styles.padHintOver]} accessibilityLiveRegion="polite">
          {hint}
        </Text>
        <Keypad
          onDigit={digit}
          onDelete={() => setPadValue(padValue.slice(0, -1))}
          onClear={() => setPadValue("")}
          extra={most !== null ? { label: "Max", onPress: () => setPadValue(String(most)) } : null}
        />
        <Button label={padAction.label} kind={padAction.tone} disabled={!padAction.enabled} onPress={padGo} style={styles.padKey} />
      </Sheet>
      {toastNode}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter, paddingTop: space.x2 },
  top: { flexDirection: "row", alignItems: "center", gap: space.x1, height: size.tap },
  back: { marginLeft: -space.x3 },
  source: { flex: 1, fontFamily: font.bodySemi, fontSize: type.callout, color: color.dim },
  coin: { flexDirection: "row", alignItems: "center", gap: space.x4, marginTop: space.x3 },
  coinText: { flex: 1, minWidth: 0 },
  symbolRow: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  symbol: { flexShrink: 1, fontFamily: font.display, fontSize: type.display, lineHeight: leading.display, letterSpacing: tracking.display, color: color.white },
  name: { marginTop: space.hair, fontFamily: font.body, fontSize: type.callout, color: color.dim },
  priceCol: { alignItems: "flex-end" },
  price: { fontFamily: font.displayBold, fontSize: type.lead, color: color.white },
  change: { marginTop: space.hair, fontFamily: font.bodyBold, fontSize: type.caption },
  stats: { marginTop: space.x3, fontFamily: font.bodySemi, fontSize: type.caption, color: color.faint },
  caRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ca: { flexDirection: "row", alignItems: "center", gap: space.x2, minHeight: size.tap },
  caLabel: { fontFamily: font.bodyBold, fontSize: type.footnote, color: color.faint },
  caText: { fontFamily: font.mono, fontSize: type.footnote, color: color.dim },
  caLink: { fontFamily: font.bodySemi, fontSize: type.caption, color: color.orange },
  restricted: { fontFamily: font.bodySemi, fontSize: type.caption, color: color.caution },
  notThis: { alignSelf: "flex-start", minHeight: size.tap, justifyContent: "center" },
  notThisText: { fontFamily: font.bodySemi, fontSize: type.callout, color: color.orange },
  report: { marginTop: space.x4, marginBottom: space.x3 },
  tp: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.x3,
    marginTop: space.x5,
    padding: space.x4,
    borderRadius: radius.card,
    backgroundColor: color.ink2,
    borderWidth: size.hairline,
    borderColor: color.line,
  },
  tpText: { flex: 1 },
  tpTitle: { fontFamily: font.bodyBold, fontSize: type.lead, color: color.white },
  tpNote: { marginTop: space.hair, fontFamily: font.body, fontSize: type.caption, lineHeight: leading.caption, color: color.faint },
  dockHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.x3, marginBottom: space.x3 },
  heldCol: { flexShrink: 1, alignItems: "flex-end" },
  held: { fontFamily: font.bodySemi, fontSize: type.callout, color: color.white },
  gained: { marginTop: space.hair, fontFamily: font.bodySemi, fontSize: type.footnote },
  confirmLine: { marginBottom: space.x3, textAlign: "center", fontFamily: font.bodyBold, fontSize: type.body, lineHeight: leading.body, color: color.white },
  pair: { flexDirection: "row", gap: space.x2 },
  half: { flex: 1 },
  chips: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: space.x2, marginBottom: space.x3 },
  note: { marginTop: space.x2, textAlign: "center", fontFamily: font.body, fontSize: type.footnote, lineHeight: leading.footnote, color: color.faint },
  figure: { fontFamily: font.display, fontSize: type.figure, lineHeight: leading.figure, letterSpacing: tracking.figure, color: color.white, textAlign: "center" },
  figureEmpty: { color: color.faint },
  padHint: { minHeight: leading.caption, marginTop: space.x1, marginBottom: space.x3, textAlign: "center", fontFamily: font.bodySemi, fontSize: type.caption, lineHeight: leading.caption, color: color.dim },
  padHintOver: { color: color.caution },
  padKey: { marginTop: space.x3 },
});
