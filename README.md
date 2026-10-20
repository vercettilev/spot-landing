# Spot landing

The early-access page for **Spot: ape from any app**. It says what Spot gets you, not what it has: you're in four taps after the CA drops, the rugs are sniffed out first, your initials come out at 2x, and it's dollars in and dollars out. Each part is one big line, one plain sentence and one picture (a chart, the sniff report, a lock screen). The page speaks CT a first-time ape can follow: CA, rug, dev, bag, initials, exit liquidity.

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
src/components/PhoneDemo.tsx  Spot on an iPhone, on a loop through X, TikTok, Telegram and a coin's page in Safari: Share (on X, X's own menu and its Share via… first), Spot, the sniff stamped CLEAN, Ape $25, back to the app (SOL, example data)
src/components/DemoLoop.tsx   the demo's clock controls: the apps to jump to, the step arrows; a tap on the phone holds it
src/components/demo/          the four apps the demo goes through, and the marks and chart they share
src/components/Iphone.tsx     the iPhone the demo and the lock screen are drawn on, sized in iOS points
src/components/EarlyChart.tsx "Early, not exit liquidity." as a coin's chart: the CA drops, you're in, they buy the top
src/components/LockScreen.tsx "Initials out at 2x" as a locked iPhone: the 2x ping, and the dump alert dropping in on top
src/components/Sources.tsx    where Spot reads a coin from on its own: X, TikTok, Telegram, YouTube, a coin's page in the browser
src/components/JoinButton.tsx the second "Save my spot": back up to the form, cursor in the field
src/components/Reveal.tsx     plays the sniff report and the dump alert once they scroll into view
src/lib/email.ts              optional notes to ourselves (new signup, or a rescue if the store is down)
src/lib/invite.ts             who is invited next, once each, and the unsubscribe links (with inviteMail.ts, the email)
src/app/admin                 the owner's invites page, behind SPOT_ADMIN_KEY; its API is src/app/api/admin/invites
src/app/unsubscribe           where an invite's unsubscribe link lands; a mail app's one-click goes to src/app/api/unsubscribe
src/components/SpotPuppy.tsx  the mascot; press it and it barks, the angry one growls
src/app/api/resolve, sniff    the app's API: a share in, its coin out; a coin in, the sniff out
src/engine/                   what those two run on (see src/engine/README.md)
src/core/                     vendored from Poppin's spot-core, byte for byte
src/components/puppyArt.ts    the logo traced and split into ears, jaw, head and paws (generated)
public/                       the 23-second film, its poster, the bark and growl, logo files
scripts/waitlist.ts           counts per phone, or a CSV of the list
brand/banners/                X and LinkedIn headers, orange and black, at 1x and 2x, and their source
brand/card/render.cjs         the link card (src/app/opengraph-image.png, twitter-image.png), drawn from the page's phone demo
```

## Run it

```
npm install
npm test        # the form's rules and the endpoint
npm run dev
```

Locally the form cannot store anything without the Blob credentials described under *Reading the list*, and BotID needs to reach Vercel, so the full signup path is best tried on a preview deployment. A preview keeps nothing: its line lives in memory and no address reaches the store, so trying it never touches the live list.

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

## Inviting people

When Spot is ready for a phone, `/admin` sends the people waiting for it one invite each, in line order. It shows the list per phone (on it, invited, waiting, no link yet, unsubscribed) and the next people in line with their addresses masked; sends you a test; and invites the next N, at most 100 a press. Nobody gets a second invite: each person is claimed in Redis before their email goes, and a failed email gives the claim back for the next press. Every invite has an unsubscribe link (and the headers mail apps use for one-click unsubscribe); who unsubscribed is never mailed again.

Set up once, in this order:

1. **Resend.** Make an account, add the domain `usespot.fun`, and add the DNS records it lists at Squarespace, next to Google Workspace's: a DKIM key (`resend._domainkey`) and a `send.` subdomain for bounces, which leave the inbox alone. While there, add a DMARC record if there is none (there was none on 16 October 2026): TXT, host `_dmarc`, value `v=DMARC1; p=none;`. Gmail and Yahoo look for it. Wait until Resend says the domain is verified: mail from an unverified domain lands in spam or nowhere. The free plan sends 100 a day and 3,000 a month, so a day's 100 is one full press; `OPS_INBOX`, if set, spends from the same 100 with a note per signup.
2. **Vercel, Production:** `RESEND_API_KEY` (from Resend), `MAIL_FROM` (`Spot <hello@usespot.fun>`; people reply to invites, so make `hello@` an alias of a Workspace inbox, or set `MAIL_REPLY_TO`), `SPOT_ADMIN_KEY` (a long random string; `openssl rand -hex 24 | pbcopy` puts one on the clipboard without showing it, so it stays out of terminals and chats; keep it in Passwords), and the link each phone's invite opens: `INVITE_URL_ANDROID` (the dApp Store listing, or the test APK), `INVITE_URL_SEEKER` (if Seeker should go elsewhere; else Android's), `INVITE_URL_IPHONE` (when there is one). A phone without a link is not invited. Also `MAIL_POSTAL_ADDRESS`, the company's postal address, for the footer: US law (CAN-SPAM) wants one in mail like this. Optional: `MAIL_REPLY_TO` (else `OPS_INBOX`, else `MAIL_FROM`). Redeploy.
3. Open `www.usespot.fun/admin`, enter the key, send yourself a test, then invite.

Who was invited and who unsubscribed live in Redis (`spot:invited`, `spot:unsubscribed`), as hashes of addresses, like the line.

## Things to know

- **The operator.** `/privacy` names the company that runs the site (`OPERATOR` in `src/lib/site.ts`). It has to be the real legal operator, so change it if Spot gets its own company.
- **Claims.** Every line is a promise about the first version, in the engine's own words where it has them. The sniff report shows only checks `src/engine/sniff.ts` runs, with its labels, and its verdict is the engine's warn line ("GRRR. Risky. Ape $18 max."). "If it's a trap, Spot won't buy it" is the block rule (no way to sell, a dev who can freeze or take the coins); "keeps your ape small" is the warn cap (at most $50). "Works from X, TikTok, Telegram, YouTube and coin pages in your browser" is what `/api/resolve` reads on its own: the posts, and a link with the coin's address in it (DEX Screener, pump.fun, Birdeye, Solscan and the like); anything else is a screenshot, read on the phone. The phone demo shares from four of them, X, TikTok, Telegram and SOL's DEX Screener page in Safari, never from an app or a page that would need a screenshot; "+ any app" beside it means by screenshot, and says so when pointed at. "Four taps" is the way from X: Share, then X's own Share via…, then Spot, then Ape, and the demo shows X's menu too; where Share opens the phone's share sheet straight away, it is one tap fewer. Still to ship before the page is true: take profit (sell half at 2x, from the buyer's own wallet under a rule they approved when buying), the alert when the dev dumps, Spot paying the gas, and iPhone. "Spot never holds them" is the design: the wallet signs, Spot holds no key. Keep the page and the film in step with the product.
- **The film** (`public/spot-promo.mp4`, with `public/spot-promo-poster.jpg`) is no longer on the page; the phone demo shows the same steps. It is kept at its address for posts, and it uses example data.
- **The line.** A newcomer gets the next number; each friend who joins through their link subtracts 10 (and a half, so they pass ten people rather than tie with the tenth). Ties go to whoever came first. A repeat of an address, however it is typed (`j.doe+x@gmail.com` is `jdoe@gmail.com`), keeps its place and credits nobody, and one network can give 5 referral credits a day. `REF_BONUS` in `src/lib/referral.ts` sets both the move and the "10 spots" the page promises.
- **The banners.** `brand/banners/banners.html` is the source and `render.cjs` makes the PNGs (`npm i -g playwright` once, then `NODE_PATH="$(npm root -g)" node brand/banners/render.cjs`). The puppy is read from `puppyArt.ts`, so a new rig shows up on the next render. The X header is the line and the apps the posts come from (X, TikTok, Instagram, Reddit and Telegram, and a plain globe for the browser; the marks are those companies', so check their brand rules before using them in ads); the LinkedIn cover is the line and the puppy. Nothing sits where X and LinkedIn put the profile photo (bottom left). The X header is laid out for the phone: the app draws the status bar, the Dynamic Island and its back, search and menu buttons over the top and both edges, so everything keeps to the middle (the zones are in the comment above `.x`). X does not publish these, so check a new one on a phone after uploading. Upload the plain file; the `@2x` one is for a sharper result where a platform takes the larger size.
- **The link card** (`src/app/opengraph-image.png`, the same file as `twitter-image.png`) is drawn from the page: `brand/card/render.cjs` copies the phone demo twice, held at two moments of its X loop (the sheet with Spot lit, then CLEAN with Ape $25), beside the line, "Buy crypto from any post, in 4 taps." and the platforms. With `npm run dev` running: `NODE_PATH="$(npm root -g)" node brand/card/render.cjs` (Playwright as for the banners, and ffmpeg). The bottom left stays clear, where X lays the page's title over a card. Change the alt texts beside the images with it.
- **Who commits.** If a deployment ever shows as Blocked, check who authored the newest commit: on a Hobby team with a private repo, Vercel deploys only the owner's commits.
