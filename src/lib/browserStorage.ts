// Every key this site writes to localStorage or sessionStorage, in one place, so
// "Remove my data from this device" can clear all of them. A new key must be
// added here; browserStorage.test.ts fails if a file writes an unlisted key.

export const LOCAL_STORAGE_KEYS = {
  /** Enrollment form answers, then only the access token and test progress after submitting. */
  enrollment: "fb-enrollment-v1",
  /** The pricing location the visitor last picked. */
  pricingLocation: "fb-pricing-location",
  /** Random analytics session id, replaced after 30 days. */
  analyticsSession: "fb-analytics-session-v1",
  /** First-touch attribution, ignored and deleted after 30 days. */
  attribution: "fb-attribution-v1",
} as const;

export const SESSION_STORAGE_KEYS = {
  /** Which once-per-tab events were already sent. */
  analyticsOnce: "fb-analytics-once-v1",
} as const;

/** Removes every key this site stores in the browser. Never throws. */
export const clearSiteStorage = () => {
  for (const [storage, keys] of [
    [() => window.localStorage, Object.values(LOCAL_STORAGE_KEYS)],
    [() => window.sessionStorage, Object.values(SESSION_STORAGE_KEYS)],
  ] as const) {
    for (const key of keys) {
      try {
        storage().removeItem(key);
      } catch {
        /* storage unavailable */
      }
    }
  }
};
