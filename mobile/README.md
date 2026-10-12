# Spot for Android

Share → Spot. See a CA in X, TikTok or Telegram, hit Share, pick Spot, and the coin opens with its sniff: the landing's buy sheet, for real. No wallet yet, so the Ape button says what it will do and the sniff is free.

It calls the site's API (`/api/resolve`, `/api/sniff`; see `../src/engine/README.md`) at `https://www.usespot.fun`. `EXPO_PUBLIC_SPOT_API` points a build at another deployment.

## What is here

```
App.tsx                      fonts, splash, safe area
src/Spot.tsx                 the flow: share → reading → coin, "which one?", nothing, failed
src/share.ts                 Share → Spot (expo-share-intent); share.web.ts reads ?url=&text= instead
src/api.ts                   the two calls, with timeouts and words for every failure
src/logic.ts                 what a share becomes, amount chips under a cap, numbers in CT, the button
src/components/CoinSheet.tsx the buy sheet: coin, amount, TP, the sniff report, the Ape button
src/components/SniffReport.tsx  the paper: questions, answer chips, GRRR and NOPE stamps
src/components/Chooser.tsx   "Which one?" for shares that name several coins
src/components/Home.tsx      opened from the launcher: what Spot is, paste a CA, try one
src/art.ts                   the landing's icon and wordmark SVGs
assets/                      app icon, adaptive icon, splash (rendered from public/spot-icon.svg)
```

## Get it on a phone

Every push that touches `mobile/` builds an APK in GitHub Actions (`.github/workflows/android.yml`). Open the run under the repo's **Actions** tab, download **spot-android** from Artifacts, unzip, and open the `.apk` on the phone (Android asks once to allow installs from that app). Solana Seeker included.

The APK is signed with Expo's debug key: fine for testing, not for a store. The dApp Store and Google Play need a release key of our own, set up when we list it.

## Work on it

```
npm install
npm test             # src/logic.ts
npm run typecheck
npx expo export --platform web   # look at the screens in a browser: /?url=https://x.com/… or /?text=$WIF
```

Expo Go cannot receive shares (the share target is native). For a live-reloading build on a phone: `npx expo run:android` with Android Studio, or `npx eas-cli build --profile development`.

## Next

The wallet (embedded, policy-limited for take profit), the buy itself with Spot paying the gas, sells, and the alerts the landing promises. Screenshots through the share sheet (on-device OCR) after that.
