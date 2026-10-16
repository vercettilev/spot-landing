# Spot landing

The early-access page for **Spot: ape from any app**. It says what Spot gets you, not what it has: you're in three taps after the CA drops, the rugs are sniffed out first, your initials come out at 2x, and it's dollars in and dollars out. Each part is one big line, one plain sentence and one picture (a chart, the sniff report, a lock screen). The page speaks CT a first-time ape can follow: CA, rug, dev, bag, initials, exit liquidity.

One page and one field: an email. The phone (iPhone, Android or Solana Seeker) is read from the device, or asked on the pass after joining when it cannot be (a desktop), so the first build goes where the people are. Under the field one line says how to move up: each friend who joins through your link moves you up 10 spots. (`GET /api/waitlist?next` can tell a page the number a newcomer would get; this one does not show it.)

## What is here

```
src/app/page.tsx              the page
src/app/api/waitlist/route.ts the form's endpoint: BotID, a per-IP limiter, a honeypot, then the store
src/lib/store.ts              the list: one private Vercel Blob file per address, named by its hash
src/lib/line.ts               the line: places and referral credit, in Redis (no addresses there)
src/lib/referral.ts           what page and server share about codes and links
src/app/r/[code]/route.ts     a shared link, usespot.fun/r/CODE, lands on the page with the code
src/components/SpotPass.tsx   what a reader sees once they are in: place, stamp, their link
src/components/PhoneDemo.tsx  Spot on an iPhone, on a loop through X, TikTok and Telegram: a post, Share, Spot, the sniff stamped CLEAN, Ape $25, back to the app (SOL, example data)
src/components/DemoLoop.tsx   the demo's clock controls: the apps to jump to, the step arrows; a tap on the phone holds it
src/components/demo/          the three apps the demo goes through, and the marks and chart they share
src/components/Iphone.tsx     the iPhone the demo and the lock screen are drawn on, sized in iOS points
src/components/EarlyChart.tsx "Early, not exit liquidity." as a coin's chart: the CA drops, you're in, they buy the top
src/components/LockScreen.tsx "Initials out at 2x" as a locked iPhone: the 2x ping, and the dump alert dropping in on top
src/components/Sources.tsx    the apps Spot reads posts from on its own: X, TikTok, Telegram, YouTube
src/components/JoinButton.tsx the second "Save my spot": back up to the form, cursor in the field
src/components/Reveal.tsx     plays the sniff report and the dump alert once they scroll into view
src/lib/email.ts              optional notes to ourselves (new signup, or a rescue if the store is down)
src/components/SpotPuppy.tsx  the mascot; press it and it barks, the angry one growls
src/app/api/resolve, sniff    the app's API: a share in, its coin out; a coin in, the sniff out
src/engine/                   what those two run on (see src/engine/README.md)
src/core/                     vendored from Poppin's spot-core, byte for byte
src/components/puppyArt.ts    the logo traced and split into ears, jaw, head and paws (generated)
public/                       the 23-second film, its poster, the bark and growl, logo files
scripts/waitlist.ts           counts per phone, or a CSV of the list
brand/banners/                X and LinkedIn headers, orange and black, at 1x and 2x, and their source
```

## Run it

```
npm install
npm test        # the form's rules and the endpoint
npm run dev
```

Locally the form cannot store anything without the Blob credentials described under *Reading the list*, and BotID needs to reach Vercel, so the full signup path is best tried on a preview deployment.

## Put it live on Vercel

1. Import this repo as a new Vercel project. `vercel.json` pins the Next.js preset, so a project first created while the repo was empty (preset "Other") still builds it as Next.js.
2. Storage → create a **Private** Blob store and connect it to the project. Vercel connects it through OIDC: it sets `BLOB_STORE_ID`, and each request carries a short-lived token the SDK picks up. The site needs nothing else, so the store's read-write token can be revoked once a signup has gone through.
3. Storage → create **Upstash for Redis** (the free plan is plenty; pick the region nearest the functions, US East) and connect it to the project. That sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without it the form still takes signups; it just shows no places and counts no referrals.
4. Settings → Environment Variables: set `NEXT_PUBLIC_CONTACT_EMAIL` to the address for privacy requests.
5. Redeploy, so the site picks all of it up.
6. The domain is `usespot.fun`, registered through Google Workspace, so its DNS lives at Squarespace. `www.usespot.fun` serves the site and `usespot.fun` redirects to it: at Squarespace that is an A record for `usespot.fun` and a CNAME for `www`, next to Google Workspace's mail records. `SITE_URL` in `src/lib/site.ts` names `www.usespot.fun`; `NEXT_PUBLIC_SITE_URL` overrides it (see `.env.example`).
7. Optional: `RESEND_API_KEY`, `MAIL_FROM` and `OPS_INBOX` for a note per signup and a mail rescue when the store fails.
   For the app's API: `JUPITER_API_KEY` and `SOLANA_RPC_URL`, for Production and Preview (see `src/engine/README.md`).
8. Turn on Web Analytics in the project to count visits.

## Reading the list

The store's **Manage Blobs** page in the Vercel dashboard shows one file per signup under `signups/`. For counts or a CSV, connect the store to the **Development** environment as well, so `vercel env pull` brings `BLOB_STORE_ID` and a `VERCEL_OIDC_TOKEN` into `.env.local` (a `BLOB_READ_WRITE_TOKEN` there works too):

```
vercel link
vercel env pull
npm run waitlist           # counts per phone
npm run waitlist -- --csv  # the list in line order
```

With the Redis variables in `.env.local` as well (connect it to Development too), the CSV comes in line order with each person's place, code, whose link brought them and how many friends they brought. Invite people in that order: it is the one the page showed them.

## Things to know

- **The operator.** `/privacy` names the company that runs the site (`OPERATOR` in `src/lib/site.ts`). It has to be the real legal operator, so change it if Spot gets its own company.
- **Claims.** Every line is a promise about the first version, in the engine's own words where it has them. The sniff report shows only checks `src/engine/sniff.ts` runs, with its labels, and its verdict is the engine's warn line ("GRRR. Risky. Ape $18 max."). "If it's a trap, Spot won't buy it" is the block rule (no way to sell, a dev who can freeze or take the coins); "keeps your ape small" is the warn cap (at most $50). "Works from X, TikTok, Telegram and YouTube" is what `/api/resolve` reads on its own; anything else is a screenshot, read on the phone. The phone demo shares from three of them, X, TikTok and Telegram, never from an app that would need a screenshot. Still to ship before the page is true: take profit (sell half at 2x, from the buyer's own wallet under a rule they approved when buying), the alert when the dev dumps, Spot paying the gas, and iPhone. "Spot never holds them" is the design: the wallet signs, Spot holds no key. Keep the page and the film in step with the product.
- **The film** (`public/spot-promo.mp4`, with `public/spot-promo-poster.jpg`) is no longer on the page; the phone demo shows the same steps. It is kept at its address for posts, and it uses example data.
- **The line.** A newcomer gets the next number; each friend who joins through their link subtracts 10 (and a half, so they pass ten people rather than tie with the tenth). Ties go to whoever came first. A repeat of an address, however it is typed (`j.doe+x@gmail.com` is `jdoe@gmail.com`), keeps its place and credits nobody, and one network can give 5 referral credits a day. `REF_BONUS` in `src/lib/referral.ts` sets both the move and the "10 spots" the page promises.
- **The banners.** `brand/banners/banners.html` is the source and `render.cjs` makes the PNGs (`npm i -g playwright` once, then `NODE_PATH="$(npm root -g)" node brand/banners/render.cjs`). The puppy is read from `puppyArt.ts`, so a new rig shows up on the next render. The X header is the line and the apps the posts come from (X, TikTok, Instagram, Reddit and Telegram, and a plain globe for the browser; the marks are those companies', so check their brand rules before using them in ads); the LinkedIn cover is the line and the puppy. Nothing sits where X and LinkedIn put the profile photo (bottom left). The X header is laid out for the phone: the app draws the status bar, the Dynamic Island and its back, search and menu buttons over the top and both edges, so everything keeps to the middle (the zones are in the comment above `.x`). X does not publish these, so check a new one on a phone after uploading. Upload the plain file; the `@2x` one is for a sharper result where a platform takes the larger size.
- **Who commits.** If a deployment ever shows as Blocked, check who authored the newest commit: on a Hobby team with a private repo, Vercel deploys only the owner's commits.
