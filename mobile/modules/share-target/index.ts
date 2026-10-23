import { requireOptionalNativeModule } from "expo";

/* Android only (android/…/ShareTargetModule.kt); anywhere else there is no such module and these do nothing. */
const native = requireOptionalNativeModule<{ publish(): void; used(): void }>("SpotShareTarget");

/** Spot's shortcut for the share sheet's top row, there from the first run. */
export function publishShareTarget(): void {
  try {
    native?.publish();
  } catch {
    /* Spot is still among the share sheet's apps. */
  }
}

/** A share reached Spot: the shortcut ranks higher in the share sheet next time. */
export function shareTargetUsed(): void {
  try {
    native?.used();
  } catch {
    /* As above. */
  }
}
