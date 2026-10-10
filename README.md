# Spot landing

The early-access page for **Spot, the buy button for every app**: see a stock or a coin on TikTok, Reddit or X, share the post, tap Spot, confirm, and never leave the app.

One page and one form. The form asks for an email and which phone (iPhone, Android or Solana Seeker), so the first build goes where the people are.

## What is here

```
src/app/page.tsx              the page
src/app/api/waitlist/route.ts the form's endpoint: BotID, a per-IP limiter, a honeypot, then the store
src/lib/store.ts              the list: one private Vercel Blob file per address, named by its hash
src/lib/email.ts              optional notes to ourselves (new signup, or a rescue if the store is down)
src/components/SpotPuppy.tsx  the mascot; press it and it barks, the angry one growls
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

Locally the form cannot store anything without `BLOB_READ_WRITE_TOKEN`, and BotID needs to reach Vercel, so the full signup path is best tried on a preview deployment.

## Put it live on Vercel

1. Import this repo as a new Vercel project. `vercel.json` pins the Next.js preset, so a project first created while the repo was empty (preset "Other") still builds it as Next.js.
2. Storage → create a **Blob** store (Private, if it asks) and connect it to the project. That sets `BLOB_READ_WRITE_TOKEN`.
3. Settings → Environment Variables: set `NEXT_PUBLIC_CONTACT_EMAIL` to the address for privacy requests.
4. Redeploy, so the site picks up both.
5. Add the domain when it is picked, then redeploy. Links and social cards follow the project's production domain on their own; `NEXT_PUBLIC_SITE_URL` only overrides that (see `.env.example`).
6. Optional: `RESEND_API_KEY`, `MAIL_FROM` and `OPS_INBOX` for a note per signup and a mail rescue when the store fails.
7. Turn on Web Analytics in the project to count visits.

## Reading the list

```
vercel env pull
npm run waitlist           # counts per phone
npm run waitlist -- --csv  # email,platform,created_at
```

## Things to know

- **The operator.** `/privacy` names the company that runs the site (`OPERATOR` in `src/lib/site.ts`). It has to be the real legal operator, so change it if Spot gets its own company.
- **Claims.** The safety section lists only checks the trading engine actually runs: a sell route, mint authority, freeze authority and holder count. Top-holder share is not one of them, so it is not promised. Keep the page and the film in step with the product.
- **The film** is `public/spot-promo.mp4` (H.264, about 2 MB) with `public/spot-promo-poster.jpg`. It uses example data, and the page says so.
- **Who commits.** If a deployment ever shows as Blocked, check who authored the newest commit: on a Hobby team with a private repo, Vercel deploys only the owner's commits.
