/**
 * PROMISES KEPT. What the app may promise only once it is real. Each flag
 * hides its words until the thing itself ships, and is switched on in the
 * same build that ships it, not one before.
 */

/** "Never round-trip a 2x": after an ape, Spot offers to sell half at 2x through Jupiter's trigger orders (src/half.ts). */
export const AUTO_SELL = true;

/** Barks that reach the phone: the dev dumps, the pool gets pulled, a coin hits 2x. Needs the watcher and push.
    The coins aped are kept as a watch list (store.tsx) for then; alerts come back on Home with this flag. */
export const PINGS = false;
