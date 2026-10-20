"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

type Count = { onList: number; invited: number; unsubscribed: number; waiting: number; noLink: number };
type Summary = {
  mail: boolean;
  postal: boolean;
  links: { android: boolean; seeker: boolean; iphone: boolean };
  byPhone: Record<string, Count>;
  next: { place: number | null; email: string; platform: string }[];
};

const PHONES = [
  ["android", "Android"],
  ["seeker", "Seeker"],
  ["iphone", "iPhone"],
  ["unknown", "Not picked"],
] as const;

/* The table's columns, and on a phone each number's label. */
const COLUMNS = [
  ["onList", "On list"],
  ["invited", "Invited"],
  ["waiting", "Waiting"],
  ["noLink", "No link yet"],
  ["unsubscribed", "Unsubscribed"],
] as const;

const KEY = "spot-admin-key";

/* What the server's refusals mean, in a line each. */
const WHY: Record<string, string> = {
  not_found: "Invites are off: SPOT_ADMIN_KEY is not set in Vercel (24 characters or more).",
  no_key: "That key is not the one in SPOT_ADMIN_KEY.",
  no_database: "The line's database is not connected.",
  no_mail: "Mail is not set up: RESEND_API_KEY and MAIL_FROM.",
  rate_limited: "Ten tests an hour. Try again later.",
  invalid_email: "That address doesn't look right.",
  test_failed: "The test did not go out.",
  send_failed: "Nothing went out, and nobody was marked invited.",
};

/**
 * THE OWNER'S INVITES PAGE, at /admin. Behind SPOT_ADMIN_KEY (kept in this
 * tab's session, never in the page): the list per phone, the next people in
 * line, a test email to yourself, and the one key that invites the next N.
 * Addresses come masked; the full list stays in the store.
 */
export default function Admin() {
  const [key, setKey] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [testTo, setTestTo] = useState("");
  const [testPhone, setTestPhone] = useState("android");
  const [count, setCount] = useState(10);

  const call = async (method: "GET" | "POST", body?: object) => {
    const res = await fetch("/api/admin/invites", {
      method,
      headers: { "x-spot-key": key, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({ error: "bad_response" }));
    if (!res.ok) throw new Error([WHY[data.error] ?? data.error, data.message].filter(Boolean).join(" "));
    return data;
  };

  const load = async () => {
    setBusy(true);
    try {
      setSummary(await call("GET"));
      try {
        sessionStorage.setItem(KEY, key);
      } catch {}
    } catch (e) {
      setSummary(null);
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) setKey(saved);
    } catch {}
  }, []);

  const test = async () => {
    setBusy(true);
    setNote("");
    try {
      const r = await call("POST", { action: "test", to: testTo, platform: testPhone });
      setNote(`Test sent to ${testTo}.${r.linkSet ? "" : " This phone has no link yet, so its key points at the site."}`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!window.confirm(`Send invites to the next ${count} in line? Emails can't be taken back.`)) return;
    setBusy(true);
    setNote("");
    try {
      const r = await call("POST", { action: "send", count });
      setNote(`Sent ${r.sent}${r.failed ? `, ${r.failed} failed and will be in the next send` : ""}.`);
      setSummary(await call("GET"));
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const waiting = summary ? Object.values(summary.byPhone).reduce((n, c) => n + c.waiting, 0) : 0;

  return (
    <main className={styles.page}>
      <h1 className={styles.h1}>Invites</h1>

      <form
        className={styles.row}
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          className={styles.input}
          type="password"
          autoComplete="off"
          placeholder="Admin key"
          aria-label="Admin key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button className={styles.key} disabled={busy || !key}>
          {summary ? "Refresh" : "Open"}
        </button>
      </form>

      {note && <p className={styles.note}>{note}</p>}

      {summary && (
        <>
          <p className={styles.status}>
            <span className={summary.mail ? styles.ok : styles.off}>Mail {summary.mail ? "ready" : "not set up"}</span>
            <span className={summary.postal ? styles.ok : styles.off}>{summary.postal ? "Postal address set" : "No postal address"}</span>
            {(["android", "seeker", "iphone"] as const).map((p) => (
              <span key={p} className={summary.links[p] ? styles.ok : styles.off}>
                {PHONES.find(([k]) => k === p)![1]} {summary.links[p] ? "link set" : "no link yet"}
              </span>
            ))}
          </p>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Phone</th>
                {COLUMNS.map(([k, label]) => (
                  <th key={k}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PHONES.filter(([k]) => summary.byPhone[k]).map(([k, label]) => {
                const c = summary.byPhone[k]!;
                return (
                  <tr key={k}>
                    <td>{label}</td>
                    {COLUMNS.map(([col, name]) => (
                      <td key={col} data-label={name}>
                        {c[col]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <h2 className={styles.h2}>Next in line</h2>
          {summary.next.length ? (
            <ol className={styles.next}>
              {summary.next.map((n) => (
                <li key={n.email + n.place}>
                  <span>{n.place ? `#${n.place}` : "—"}</span>
                  <span>{n.email}</span>
                  <span>{PHONES.find(([k]) => k === n.platform)?.[1] ?? n.platform}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.muted}>No one is waiting with a link for their phone.</p>
          )}

          <h2 className={styles.h2}>Send yourself a test</h2>
          <div className={styles.row}>
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              aria-label="Test address"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <select className={styles.select} aria-label="Phone" value={testPhone} onChange={(e) => setTestPhone(e.target.value)}>
              <option value="android">Android</option>
              <option value="seeker">Seeker</option>
              <option value="iphone">iPhone</option>
            </select>
            <button className={styles.key} onClick={() => void test()} disabled={busy || !summary.mail || !testTo}>
              Send test
            </button>
          </div>

          <h2 className={styles.h2}>Invite</h2>
          <div className={styles.row}>
            <input
              className={`${styles.input} ${styles.count}`}
              type="number"
              min={1}
              max={100}
              aria-label="How many"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            />
            <button className={`${styles.key} ${styles.go}`} onClick={() => void send()} disabled={busy || !summary.mail || !waiting}>
              Invite the next {Math.min(count, waiting) || count}
            </button>
          </div>
          <p className={styles.muted}>In line order, at most 100 a press. Nobody gets a second invite.</p>
        </>
      )}
    </main>
  );
}
