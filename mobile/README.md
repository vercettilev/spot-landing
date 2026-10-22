# Spot for Android

Share → Spot. See a CA in X, TikTok or Telegram, hit Share, pick Spot, and the coin opens with its sniff: the landing's buy sheet, for real. Apps with a share menu of their own keep the phone's behind a button (X's Share via…, More in others), and Spot is in the phone's, among its apps and, once it has been used, as "Sniff it" in the row of direct targets above them. Or select a CA and pick Spot from the menu over the selection, or long-press Spot's icon for Paste CA. Around it, one screen, **Home**: the bag's worth, one round key (Paste CA), your coins and what you sniffed lately; the Cash row opens adding cash and cashing out, and the wallet, every trade and the settings rise from its puppy.

It calls the site's API (`/api/resolve`, `/api/sniff`, `/api/holdings`, `/api/order`, `/api/execute`; see `../src/engine/README.md`) at `https://www.usespot.fun`. `EXPO_PUBLIC_SPOT_API` points a build at another deployment.

## What works, and what waits

- **Works:** a share or a paste finds the coin from a CA, a link, a `$cashtag`, a bare ticker (`WIF`, offered, never auto-picked) or a screenshot (read on the phone with ML Kit; the image never leaves). The sniff, "which one?", history, the bag of any address with what your apes made, settings, Add cash (the deposit QR, and SOL turned into USDC), and connecting the wallet on the phone through Mobile Wallet Adapter (Seed Vault, Phantom, Solflare).
- **Waits on the server:** buying and selling. The app asks `/api/order` for a transaction, the wallet signs it, `/api/execute` lands it; both answer 403 until `SPOT_TRADING=1` is set on Vercel, and the app says "Buying opens soon". Try it with a real wallet and a few dollars before opening it to anyone.
- **Not built yet:** the alert pings (a watcher on the server plus push notifications; the coins you ape are kept as the watch list for them, and alerts come back on Home when they are real), Spot paying the gas, and iPhone (Mobile Wallet Adapter is Android only; on iOS the app can watch an address).

## What is here

```
App.tsx                    fonts, splash until the phone's memory is read, safe area
src/navigation.tsx         Home and what opens over it; a share opens over whatever is showing
src/screens/               one file per screen: Home, Resolve, Coin, Choose, and the Connect, Add cash (Cash, from Home) and Settings sheets
src/store.tsx              what the app remembers, on the phone only (settings, history, watch list, activity, wallet address)
src/holdings.ts            the bag, cached per wallet for 30 s
src/wallet/                Mobile Wallet Adapter (loaded on first use), base58 for addresses
src/share.ts               Share → Spot (expo-share-intent): text, links and screenshots (ocr.ts); share.web.ts reads ?url=&text=
plugins/                   withSelectedText.js: Spot in the menu over selected text (Android's PROCESS_TEXT), arriving as a text share;
                           withShareTarget.js: the shares Spot's shortcut stands for in the share sheet's top row
modules/share-target/      that shortcut, published from the app and moved up with every share (Android's sharing shortcuts)
src/api.ts                 the calls, with timeouts and words for every failure
src/resolve.ts             a share's coin and its sniff in one request, read line by line (lines.ts) as they come
src/logic.ts               what a share becomes, amount chips under a cap, numbers in CT, the button
src/components/            the sniff report paper, "which one?", status screens, buttons, chips, toggles
src/art.ts                 the landing's icon and wordmark SVGs
assets/                    app icon, adaptive icon, splash (rendered from public/spot-icon.svg)
```

## Get it on a phone

Every push that touches `mobile/` builds an APK in GitHub Actions (`.github/workflows/android.yml`). Open the run under the repo's **Actions** tab, download **spot-android** from Artifacts, unzip, and open the `.apk` on the phone (Android asks once to allow installs from that app). Solana Seeker included. A newer APK installs over the old one; the phone keeps what Spot remembered.

That APK is signed with Expo's debug key: fine for testing, refused by stores.

## The test channel

Every push to `main` also publishes the debug-key build as the `test` release: the newest APK is always at `https://github.com/vercettilev/spot-landing/releases/download/test/spot.apk` (open it in the phone's browser, then open the file), and `version.json` next to it is what Settings reads to show "Update to x.y.z" when a newer build is out (`src/updates.ts`). A test build installs over the previous test build; it cannot install over a store build, which has another signature. After the store launch, point `updates.ts` at the store.

## The Solana dApp Store

The dApp Store takes a release APK signed with a key of Spot's own, used for this store only and for every update after the first. Lose the key and the listing can never be updated, so keep the file and its password in a password manager.

1. Make the key and give it to GitHub, once, on your own computer:
   ```
   brew install openjdk@17          # Java's keytool, if it isn't there yet
   mobile/scripts/release-key.sh
   ```
   The script makes the key in `~/.spot-release`, outside the repo (or uses the one already there), asks for its password without showing it, adds the four secrets the workflow signs with to GitHub and writes `public/.well-known/assetlinks.json`. With `--generate` there is nothing to type: it makes a 32-character password itself and keeps it in the Mac's Keychain as "Spot dApp Store key", where a later run finds it too. Then put the key file and its password in your password manager.
2. The same by hand: `keytool -genkeypair -v -keystore spot-dapp-store.jks -storetype PKCS12 -alias spot -keyalg RSA -keysize 2048 -validity 10000`, somewhere outside the repo; then in GitHub, **Settings → Secrets and variables → Actions**, add `SPOT_RELEASE_KEYSTORE` (the file in base64, on one line: `base64 -i spot-dapp-store.jks | tr -d '\n'`), `SPOT_RELEASE_KEYSTORE_PASSWORD`, `SPOT_RELEASE_KEY_ALIAS` (`spot`) and `SPOT_RELEASE_KEY_PASSWORD` (the same password, for a PKCS12 keystore).
3. The next build also uploads `spot-…-dapp-store.apk`, signed with that key. That is the file for the [Publisher Portal](https://docs.solanamobile.com/dapp-publishing/setup), which also wants a publisher wallet with a little SOL, the listing (icon, banner, screenshots, description) and identity checks.
4. Commit `public/.well-known/assetlinks.json` (the script wrote it; every store build's run summary holds it too, and warns while the committed one doesn't list the build's key), so the site serves it at `https://www.usespot.fun/.well-known/assetlinks.json`. Wallets check it when Spot connects (Mobile Wallet Adapter's identity verification): without it Phantom says the app's identity "could not be verified" and Seed Vault that it doesn't recognize the domain. Test builds, signed with Expo's public debug key, keep that warning on purpose: listing a key anyone has would let anyone sign as Spot.
5. Each update needs `android.versionCode` in `app.json` one higher than the last release.
6. The listing itself (name, descriptions, links, the 512 icon and the 1080-wide screenshots) is in `store/`: paste from `store/listing.md`. The screenshots are made from the web export with example data (`npx expo export --platform web`), so they are the real screens.

## Work on it

```
npm install
npm test             # src/logic.ts, src/wallet/base58.ts
npm run typecheck
npx expo export --platform web   # the screens in a browser: /?url=https://x.com/… or /?text=$WIF
```

Expo Go cannot receive shares or talk to wallets (both are native). For a live-reloading build on a phone: `npx expo run:android` with Android Studio, or `npx eas-cli build --profile development`.
