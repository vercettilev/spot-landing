/**
 * PROMISES KEPT. What the app may promise only once it is real. Each flag
 * hides its words until the thing itself ships, and is switched on in the
 * same build that ships it, not one before.
 */

/** "Never round-trip a 2x": Spot sells half at 2x by itself. Needs the take-profit order placed with every buy. */
export const AUTO_SELL = false;

/** Barks that reach the phone: the dev dumps, the pool gets pulled, a coin hits 2x. Needs the watcher and push.
    The coins aped are kept as a watch list (store.tsx) for then; alerts come back on Home with this flag. */
export const PINGS = false;
