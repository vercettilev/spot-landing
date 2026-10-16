import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unsubscribe } from "@/lib/invite";
import { getKv } from "@/lib/line";
import styles from "./unsubscribe.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe · Spot",
  robots: { index: false, follow: false },
};

/* The button: the secret checked, then the page again with the answer. */
async function stop(form: FormData) {
  "use server";
  const kv = getKv();
  const done = kv ? await unsubscribe(kv, String(form.get("p") ?? ""), String(form.get("t") ?? "")) : false;
  redirect(done ? "/unsubscribe?done=1" : "/unsubscribe?failed=1");
}

/**
 * WHERE AN INVITE'S UNSUBSCRIBE LINK LANDS. Opening it only asks: mail
 * scanners open links, and nobody should drop off because a filter looked.
 * The key does it. A mail app's own one-click unsubscribe skips this page and
 * posts to /api/unsubscribe.
 */
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const one = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : "");
  const [p, t] = [one("p"), one("t")];

  let body: React.ReactNode;
  if (one("done")) {
    body = (
      <>
        <h1>You&rsquo;re unsubscribed.</h1>
        <p>No more email from Spot.</p>
      </>
    );
  } else if (one("failed") || !p || !t) {
    body = (
      <>
        <h1>That link didn&rsquo;t work.</h1>
        <p>Reply to the email you got and we&rsquo;ll take you off by hand.</p>
      </>
    );
  } else {
    body = (
      <>
        <h1>Unsubscribe from Spot?</h1>
        <p>You won&rsquo;t get any more email from Spot.</p>
        <form action={stop}>
          <input type="hidden" name="p" value={p} />
          <input type="hidden" name="t" value={t} />
          <button className={styles.key}>Unsubscribe</button>
        </form>
      </>
    );
  }

  return (
    <main className={styles.page}>
      {body}
      <p className={styles.back}>
        <Link href="/">← Spot</Link>
      </p>
    </main>
  );
}
