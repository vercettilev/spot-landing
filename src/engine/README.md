# The engine: `/api/resolve` and `/api/sniff`

What the Spot app asks before anyone apes: **which coin is this share about?** and **does it smell off?** Two endpoints feed the first screen after Share → Spot: the coin's card from `/api/resolve`, then the sniff from `/api/sniff` while the "Sniffing the CA…" line runs.

Fresh coins are warned, not blocked. Spot refuses only what can take the bag away; everything that is just small or new gets a GRRR, an extra confirm and a size cap.

They ship with the site, at `https://www.usespot.fun/api/…`. Call the `www` host: the bare domain redirects, and a redirected POST can arrive as a GET.

## What is here

```
src/app/api/resolve/route.ts  share payload in, coin out
src/app/api/sniff/route.ts    a mint in, the verdict out
src/app/api/health/route.ts   which upstreams this deployment points at
src/engine/resolve.ts         links, posts, pools, cashtags → one coin, or "which one?"
src/engine/sniff.ts           the checks and the block / warn / wait rules
src/engine/links.ts           what a link says on its own (platform, post, addresses, shorteners)
src/engine/posts.ts           a post's words from public embeds; short links asked where they go
src/engine/jupiter.ts         Ultra search and the quote each way (the honeypot probe)
src/engine/chain.ts           the mint account from an RPC: keys and Token-2022 settings
src/engine/dexscreener.ts     a pool address → the coin it trades
src/engine/fakes.ts           the fake upstreams every spec runs on
src/core/                     vendored from Poppin's spot-core (see src/core/README.md)
```

`npm test` runs these specs with the site's; every upstream is a fake. `npm run dev` calls the real ones: Jupiter keyless on `lite-api.jup.ag`, the public Solana RPC, X/TikTok/YouTube oEmbed, Telegram's widget and Dexscreener.

## `GET /api/holdings?owner=…`

A wallet's bag for the app's Bag tab: `{ ok, owner, totalUsd, usdc, sol, positions: [{ token, amount, raw, usd }], hidden }`. Balances from the chain (both token programs, plus SOL), prices and faces from one Jupiter search. Coins worth under a cent, and whatever Jupiter cannot price (spam, dust), are counted in `hidden`, not listed. Errors: `400 invalid_owner`, `429`, `503 lookup_failed`.

## `POST /api/order` and `POST /api/execute` (closed by default)

The money path, built ahead of the decisions it waits on and **closed unless `SPOT_TRADING=1`** (`403 trading_closed` otherwise). `/api/order` takes `{ mint, side, taker, amountUsdc, payWith? }` for a buy (paid in USDC, or with `payWith: "sol"` in SOL worth the same dollars at Jupiter's price of the moment) or `{ …, amountRaw }` for a sell and answers Jupiter Swap V2's transaction for the taker's wallet to sign, plus a `requestId`. A buy is sniffed again on the server, whatever the app showed: `409 blocked | unsniffed | over_cap` builds nothing. A sell is never refused. `/api/execute` takes `{ requestId, signedTransaction }` and lands it through Jupiter (`{ status, signature, error, final }`). Spot holds no key, adds nothing to the transaction and takes no fee yet. Needs `JUPITER_API_KEY` (`503 needs_key`).

A failed trade is only `final` when the chain says so: Jupiter's `Failed` with a signature is checked with `getSignatureStatuses` first (landed after all → `Success`; landed and failed → final; nowhere yet → not final, it can still land until its blockhash runs out). A Jupiter that does not answer in time is `504 pending`, never failed. The app treats everything that is not final as "may still land": it watches the wallet until the order's minute and a half is up, and offers no second buy until then. That is what stops a slow network from turning one ape into two.

## Settings

On the site's Vercel project, Settings → Environment Variables, for Production and Preview. All optional; the first two are strongly advised:

- `JUPITER_API_KEY` from [developers.jup.ag](https://developers.jup.ag). With it the engine uses `api.jup.ag` and Swap V2's `/order` for quotes; without it, `lite-api.jup.ag` and `/swap/v1/quote`, which Jupiter is retiring. Real traffic needs the key.
- `SOLANA_RPC_URL`: a Helius, Triton or QuickNode endpoint (Helius's free plan is enough to start). The public one rate-limits hard: the bag reads every token account a wallet holds, and when the chain does not answer for a Token-2022 coin the sniff waits rather than guess (see below).
- `SPOT_GATE_MIN_LIQUIDITY_USD`, `SPOT_GATE_MIN_HOLDERS`, `SPOT_GATE_MIN_POOL_AGE_HOURS`: where the warn line sits (defaults $7,500, 150, 2 hours).
- `SPOT_WARN_CAP_USDC`: the most a warned coin can be bought for (default 50).
- `JUPITER_RPS`: the Jupiter plan's requests per second. With a key it defaults to 1, the free plan, and calls queue a second apart, so a sniff (three calls) takes two to three seconds. Set 10 on Developer, and so on.
- `SPOT_TRADING`: `1` opens `/api/order` and `/api/execute`. Leave it unset until the fee, the wallet and the legal read are settled.
- `SPOT_TRADING_WALLETS`: with `SPOT_TRADING=1`, only these wallets (addresses, comma separated) get an order; everyone else hears `trading_closed`. For testing with real money on the team's wallets, on the real deployment. `/api/health` then says `trading: "testing"`.
- `JUPITER_BASE_URL`, `JUPITER_QUOTE_PATH`, `JUPITER_ORDER_PATH`, `JUPITER_EXECUTE_PATH`: overrides, rarely needed.

After a deploy, `/api/health` says which host and quote path it chose, whether an RPC is set (`custom`) and whether trading is `closed`, `testing` or `open`; then sniff something known, `/api/sniff?mint=EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm` (WIF).

## `POST /api/resolve`

Body `{ "url"?: string, "text"?: string }`, exactly as the share sheet handed them over (`GET /api/resolve?url=&text=` works too, and is cached for a minute).

```json
{
  "ok": true,
  "status": "found",
  "pick": { "via": "post", "token": { "mint": "…", "symbol": "EXAMPLE", "name": "…", "icon": "…", "decimals": 6,
            "kind": "coin", "priceUsd": 0.004, "mcapUsd": 4000000, "liquidityUsd": 250000, "holders": 12000,
            "change24hPct": 12.5, "verified": false, "issuer": null, "restrictions": [] } },
  "candidates": [ "…the pick first, then other choices…" ],
  "source": { "platform": "x", "url": "https://x.com/…", "author": "@ana_trades", "text": "$EXAMPLE breaking out. CA: …" },
  "missed": []
}
```

- `status`: `found` opens the coin; `ambiguous` means ask which (`pick` is null, `candidates` are ranked); `none` means nothing in the share is a coin.
- `via`: where the coin came from. `link` (the shared link is that coin's page), `post` (a CA or a link in the post), `text`, `pair` (a pool link, mapped through Dexscreener), `cashtag`, `name` (a tokenized stock named in words; always asked, never picked).
- A ticker written without its `$` ("WIF looking strong") is looked up only when nothing else in the share names a coin, only for capitals CT does not use for everything else (GM, LFG, ATH and the like are skipped), and only offered as `ambiguous` when the coin is the catalog's, verified, or holds $50k of liquidity.
- How it reads a share: the shared link first (pump.fun, birdeye, solscan, gmgn, bullx, jup.ag, trading-bot `start=` links…), short links (t.co, vm.tiktok.com, bit.ly) asked where they go without being followed, then the post's own words (X and TikTok and YouTube oEmbed, public Telegram posts), then the links inside the post, then cashtags. A cashtag is the catalog's mint when spot-core curated one (`$BTC` is WBTC, `$TSLA` is TSLAx), otherwise the namesake that spot-core's tiebreaks say dwarfs the others; namesakes Spot could never buy (a live freeze key) do not count as rivals.
- `restrictions`: who the issuer says may not hold it (`us-persons` for every tokenized stock). Returned, not applied: the app knows its user's region.
- `missed`: upstreams that did not answer (`post`, `search`, `pairs`, `short_link`). When Jupiter could not be asked and nothing was found, the answer is `503 lookup_failed` instead of a "none" that would be a guess.
- Errors: `400 nothing_shared | url_too_long | bad_json`, `429 rate_limited`, `503 lookup_failed`.

## `GET /api/sniff?mint=…&amount=25`

`amount` is in USDC (1 to 10,000, default 25) and sizes the round trip, since an exit that holds for 5 USDC can fold at 500.

```json
{
  "ok": true,
  "mint": "…",
  "level": "warn",
  "headline": "GRRR. Risky. Ape $50 max.",
  "token": { "…": "the same card resolve returns" },
  "checks": [
    { "id": "honeypot", "label": "Honeypot?", "answer": "No", "status": "good", "blocks": false, "note": null, "observed": 0.03, "threshold": 0.5 },
    { "id": "freeze", "label": "Dev can freeze it?", "answer": "No", "status": "good", "blocks": false, "note": null, "observed": null, "threshold": null },
    { "id": "mint", "label": "Dev can print more?", "answer": "No", "status": "good", "blocks": false, "note": null, "observed": null, "threshold": null },
    { "id": "liquidity", "label": "Big enough pool?", "answer": "Only $4.2k", "status": "warn", "blocks": false, "note": "Small pool: your buy moves the price.", "observed": 4200, "threshold": 7500 },
    { "id": "holders", "label": "Enough holders?", "answer": "Only 38", "status": "warn", "blocks": false, "note": null, "observed": 38, "threshold": 150 },
    { "id": "age", "label": "How old?", "answer": "20 min", "status": "warn", "blocks": false, "note": "Just launched.", "observed": 1208434, "threshold": 7200000 }
  ],
  "maxBuyUsdc": 50,
  "roundTrip": { "inUsdc": 25, "outUsdc": 24.25, "lossPct": 3 },
  "checkedAt": "2026-10-12T12:00:00.000Z"
}
```

Every question is asked so that "No" is the good answer, and every note says what it means for the bag in plain words.

`level`: `ok` buy; `warn` GRRR, confirm twice, at most `maxBuyUsdc`; `block` Spot will not buy it; `unknown` a check that could block got no answer, so try again (never cached). `maxBuyUsdc` is `null` for no cap and `0` when the coin cannot be bought now. Errors: `400 invalid_mint | is_usdc | invalid_amount`, `404 not_found` (Jupiter has no record yet, often a coin minutes old) `| not_a_mint`, `429`, `503 lookup_failed`. Answers are shared through the CDN for 10 seconds.

### The rules

| | what | why |
| --- | --- | --- |
| **block** | no route to sell back to USDC, or selling straight back returns less than half | the honeypot shape: a way in and no way out |
| **block** | a live freeze key, a pause switch, accounts that start frozen | dev can lock the bag |
| **block** | a permanent delegate | dev can move or burn the bag |
| **block** | a token that cannot be transferred, or a transfer tax of 50% or more | nothing to sell, or nothing left after |
| **block** | no route from USDC at all | nothing to buy |
| **warn** | liquidity under $7.5k, under 150 holders, a pool under 2 hours old | small and new is the market, not a scam |
| **warn** | a live mint key (unless big, old, verified and organic: a bridge or a DAO) | dev can print more |
| **warn** | a round trip losing 15–50%, a transfer tax, a transfer hook, Jupiter's `isSus` flag | an exit that costs, or could be stopped |
| **wait** | the exit probe or a Token-2022 mint read did not answer | "could not check" never reads as "passed" |

The keys are read from the chain (`getAccountInfo`, jsonParsed) and from Jupiter when the chain does not answer; for a classic SPL token a silent chain costs nothing, for a Token-2022 one it holds the buy. Tokenized stocks and bridged coins from spot-core's catalog keep their issuer's keys on purpose: those show as `info` and do not count against them, and they are never held to the size floors. They are still blocked when there is no way out.

The floors are spot-core's, calibrated on live mints in August 2026 to tell established coins from fresh ones; here they set how loud the warning is, never whether a coin can be bought. Top-holder concentration is left out on purpose: spot-core measured that it separated nothing (Ultra counts pools and CEX wallets as holders).

## Things to know

- Not yet run against the live upstreams. The specs fake every upstream, and the built server was run end to end against a stand-in for Jupiter and the RPC. The shapes come from spot-core's live measurements (Ultra search, quotes, through September 2026) and Jupiter's docs (Swap V2 `/order`, routing error codes, Tokens V2 `audit` flags); the first deploy should be checked against a handful of known coins, a known honeypot and a Token-2022 coin.
- `/api/sniff` makes four upstream calls (search, mint, buy quote, sell quote), three of them at once when the plan allows. Jupiter calls share one pacer per instance, and a 429 gets one more try at the time Jupiter names. Without a key it runs on `lite-api.jup.ag` for as long as Jupiter keeps it up; Jupiter's keyless tier on `api.jup.ag` allows about 0.5 requests a second, which a few sniffs outrun.
- The limiters bound one function instance (30 resolves and 60 sniffs a minute per IP). For a fleet-wide limit, add a Vercel Firewall rate-limit rule on `/api/*`.
- No keys, cookies or wallets here: everything the engine reads is public. Swaps, signing and take profit move money and hold a fee payer's key, so they get their own private backend rather than a home in the site.
