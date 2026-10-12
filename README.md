# Spot landing

The early-access page for **Spot: ape from any app**. See a CA on X, TikTok or Telegram, share the post to Spot, confirm with Face ID, and never leave the app. Selling is the same move, and Spot can take profit for you at a price you set. The page speaks CT: CA, honeypot, mint and freeze revoked, TP, USDC.

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
src/components/PhoneDemo.tsx  Spot on a phone, on a loop: share, sniff, take profit on, Face ID, done (example data)
src/components/Reveal.tsx     plays the stamp and the receipt once they scroll into view
src/lib/email.ts              optional notes to ourselves (new signup, or a rescue if the store is down)
src/components/SpotPuppy.tsx  the mascot; press it and it barks, the angry one growls
src/app/api/resolve, sniff    the app's API: a share in, its coin out; a coin in, the sniff out
src/engine/                   what those two run on (see src/engine/README.md)
src/core/                     vendored from Poppin's spot-core, byte for byte
src/components/puppyArt.ts    the logo traced and split into ears, jaw, head and paws (generated)
public/                       the 23-second film, its poster, the bark and growl, logo files
scripts/waitlist.ts           counts per phone, or a CSV of the list
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
- **Claims.** The sniff report lists only checks the trading engine actually runs: a sell route, mint authority, freeze authority and holder count. Top-holder share is not one of them, so it is not promised. The page also promises two things after a buy, and both have to ship in the first version: an alert when a coin turns (its creator selling, liquidity pulled), and an optional take profit (half at 2×) that sells from the buyer's own wallet under a rule they approved when buying. Keep the page and the film in step with the product.
- **The film** (`public/spot-promo.mp4`, with `public/spot-promo-poster.jpg`) is no longer on the page; the phone demo shows the same steps. It is kept at its address for posts, and it uses example data.
- **The line.** A newcomer gets the next number; each friend who joins through their link subtracts 10 (and a half, so they pass ten people rather than tie with the tenth). Ties go to whoever came first. A repeat of an address, however it is typed (`j.doe+x@gmail.com` is `jdoe@gmail.com`), keeps its place and credits nobody, and one network can give 5 referral credits a day. `REF_BONUS` in `src/lib/referral.ts` sets both the move and the "10 spots" the page promises.
- **Who commits.** If a deployment ever shows as Blocked, check who authored the newest commit: on a Hobby team with a private repo, Vercel deploys only the owner's commits.
