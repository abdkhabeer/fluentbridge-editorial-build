// Data-handling periods. Used by the server (enforcement) and the privacy page
// (disclosure), so the two can't drift apart.

/** Student access tokens stop working this many days after the application is created. */
export const ACCESS_TTL_DAYS = 30;
/** Prospective-student records with no activity for this long are deleted automatically. */
export const PROSPECT_RETENTION_DAYS = 365;
/** Enrolled-student records are reviewed for deletion this many months after the last lesson (manual). */
export const ENROLLED_REVIEW_MONTHS = 24;
