# Spot for Android

Share → Spot. See a CA in X, TikTok or Telegram, hit Share, pick Spot, and the coin opens with its sniff: the landing's buy sheet, for real. Four tabs around it: **Sniff** (paste a CA, what you sniffed lately), **Bag** (the wallet's coins and cash), **Alerts** (coins watched, what happened) and **Me** (stats, wallet, settings).

It calls the site's API (`/api/resolve`, `/api/sniff`, `/api/holdings`, `/api/order`, `/api/execute`; see `../src/engine/README.md`) at `https://www.usespot.fun`. `EXPO_PUBLIC_SPOT_API` points a build at another deployment.

## What works, and what waits

- **Works:** a share or a paste finds the coin from a CA, a link, a `$cashtag`, a bare ticker (`WIF`, offered, never auto-picked) or a screenshot (read on the phone with ML Kit; the image never leaves). The sniff, "which one?", history, the watch list, the bag of any address, settings, the deposit QR, and connecting the wallet on the phone through Mobile Wallet Adapter (Seed Vault, Phantom, Solflare).
- **Waits on the server:** buying and selling. The app asks `/api/order` for a transaction, the wallet signs it, `/api/execute` lands it; both answer 403 until `SPOT_TRADING=1` is set on Vercel, and the app says "Buying opens soon". Try it with a real wallet and a few dollars before opening it to anyone.
- **Not built yet:** the alert pings (a watcher on the server plus push notifications; the rules set in the app carry over), Spot paying the gas, and iPhone (Mobile Wallet Adapter is Android only; on iOS the app can watch an address).

## What is here

```
App.tsx                    fonts, splash until the phone's memory is read, safe area
src/navigation.tsx         four tabs and what opens over them; a share opens over any tab
src/screens/               one file per screen: Sniff, Resolve, Coin, Choose, Bag, Alerts, Me, Deposit, Connect
src/store.tsx              what the app remembers, on the phone only (settings, history, watch list, activity, wallet address)
src/holdings.ts            the bag, cached per wallet for 30 s
src/wallet/                Mobile Wallet Adapter (loaded on first use), base58 for addresses
src/share.ts               Share → Spot (expo-share-intent): text, links and screenshots (ocr.ts); share.web.ts reads ?url=&text=
src/api.ts                 the calls, with timeouts and words for every failure
src/logic.ts               what a share becomes, amount chips under a cap, numbers in CT, the button
src/components/            the sniff report paper, "which one?", status screens, buttons, chips, toggles
src/art.ts                 the landing's icon and wordmark SVGs
assets/                    app icon, adaptive icon, splash (rendered from public/spot-icon.svg)
```

## Get it on a phone

Every push that touches `mobile/` builds an APK in GitHub Actions (`.github/workflows/android.yml`). Open the run under the repo's **Actions** tab, download **spot-android** from Artifacts, unzip, and open the `.apk` on the phone (Android asks once to allow installs from that app). Solana Seeker included. A newer APK installs over the old one; the phone keeps what Spot remembered.

That APK is signed with Expo's debug key: fine for testing, refused by stores.

## The Solana dApp Store

The dApp Store takes a release APK signed with a key of Spot's own, used for this store only and for every update after the first. Lose the key and the listing can never be updated, so keep the file and its password in a password manager.

1. Make the key, once, on your own computer (Java's `keytool`):
   ```
   keytool -genkeypair -v -keystore spot-dapp-store.jks -alias spot -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 spot-dapp-store.jks > spot-dapp-store.b64     # macOS: base64 -i spot-dapp-store.jks -o spot-dapp-store.b64
   ```
2. In GitHub, **Settings → Secrets and variables → Actions**, add `SPOT_RELEASE_KEYSTORE` (the contents of the `.b64` file), `SPOT_RELEASE_KEYSTORE_PASSWORD`, `SPOT_RELEASE_KEY_ALIAS` (`spot`) and `SPOT_RELEASE_KEY_PASSWORD` (the same password, for a PKCS12 keystore).
3. The next build also uploads `spot-…-dapp-store.apk`, signed with that key. That is the file for the [Publisher Portal](https://docs.solanamobile.com/dapp-publishing/setup), which also wants a publisher wallet with a little SOL, the listing (icon, banner, screenshots, description) and identity checks.
4. Each update needs `android.versionCode` in `app.json` one higher than the last release.
5. The listing itself (name, descriptions, links, the 512 icon and the 1080-wide screenshots) is in `store/`: paste from `store/listing.md`. The screenshots are made from the web export with example data (`npx expo export --platform web`), so they are the real screens.

## Work on it

```
npm install
npm test             # src/logic.ts, src/wallet/base58.ts
npm run typecheck
npx expo export --platform web   # the screens in a browser: /?url=https://x.com/… or /?text=$WIF
```

Expo Go cannot receive shares or talk to wallets (both are native). For a live-reloading build on a phone: `npx expo run:android` with Android Studio, or `npx eas-cli build --profile development`.
