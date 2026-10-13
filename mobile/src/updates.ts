/**
 * THE TEST CHANNEL. Until Spot is in the dApp Store, every push to main
 * publishes a build at a fixed link, and this is how the app learns a newer
 * one is out: a tiny version.json next to the APK. After the store launch,
 * updates come from the store and this points there instead.
 */

const RELEASE = "https://github.com/vercettilev/spot-landing/releases/download/test";

export interface Update {
  version: string;
  versionCode: number;
  apk: string;
}

/** A newer build than the one running, or null. Never throws, never slow. */
export async function checkForUpdate(current: number, fetchFn: typeof fetch = fetch): Promise<Update | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetchFn(`${RELEASE}/version.json?t=${Date.now()}`, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as Partial<Update> | null;
    if (!body || typeof body.versionCode !== "number" || typeof body.version !== "string" || typeof body.apk !== "string") return null;
    return body.versionCode > current ? { version: body.version, versionCode: body.versionCode, apk: body.apk } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
