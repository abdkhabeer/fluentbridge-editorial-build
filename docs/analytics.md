# Funnel analytics and lead attribution

First-party only. There are no third-party analytics scripts, cookies or pixels. (Fonts still load from Google Fonts, which the privacy page already discloses.)

## What is collected

| Data | Where | Personal data? |
|---|---|---|
| Funnel events: `intake_started`, `intake_step_completed` (step 1 to 4), `test_started`, `test_progress` (10, 20, 30 answered), `test_completed`, `results_viewed`, `whatsapp_clicked` (location), `trial_cta_clicked` (location) | `POST /api/events`, stored as `events/<UTC day>/<id>` in Blobs | No. Each event has a random browser id (`fb-analytics-session-v1` in localStorage, renewed after 30 days), the event name, whitelisted properties and a timestamp. No IP, user agent, name, email or phone number. |
| Which "once per tab" events were already sent (`intake_started`, `test_started`, `test_progress`, `test_completed`, `results_viewed`) | `fb-analytics-once-v1` in sessionStorage, cleared when the tab closes | No. Event names only. |
| First-touch attribution: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, the referring page (origin and path, no query string), the landing path, and when it was captured | `fb-attribution-v1` in localStorage, for 30 days | Stays on the device unless lead attribution is enabled. |
| Attribution and the browser id on a lead | `attribution` and `analytics_session_id` on the application record | Yes, once linked to a lead. **Only when `FEATURE_LEAD_ATTRIBUTION=true`**, checked by both the browser and the server. |

Code: `src/lib/analytics/events.ts` (shared rules), `src/lib/analytics/client.ts` (browser), `server/analytics.ts` (storage and the Funnel report). Events are deleted by the daily retention job (`netlify/functions/retention-cleanup.mts`, `@daily`) once their UTC day is more than `PROSPECT_RETENTION_DAYS` (365 days) old. Netlify runs scheduled functions only on the production deploy, so deploy previews never delete anything. Tests: `server/retentionSchedule.test.ts` and the retention block in `server/api.test.ts`.

## Verified against the code

- **Retention:** `runRetention` in `server/api.ts` deletes `events/<day>/` keys older than 365 days. The scheduled wrapper and the cutoff have tests.
- **No IP or user agent:** `recordEvent` in `server/analytics.ts` stores only `name`, `session_id`, the whitelisted `props` and `at`. `parseEvent` drops every other field. The Blobs write carries no metadata. Netlify's own rate limiter on `/api/events` counts requests by IP at the edge, but nothing from it is stored by us. Error logs print the route and error message only.
- **Session id:** `fb-analytics-session-v1` in localStorage, `{ id, created_at }`, 32 random hex characters from `crypto.getRandomValues`. It is replaced with a new id on the first event more than 30 days after `created_at`; the old value is not deleted on its own before then. It leaves the browser only inside events, and on an application only when lead attribution is on.

The admin Funnel view is at `/instructor/funnel`: distinct browsers per step and the conversion from the step above, over a UTC date range of up to 92 days.

## Approved wording (applied October 2026)

### Privacy page, "Technical information"

Replaces "We don't use analytics, advertising, or tracking cookies." in `src/pages/Privacy.tsx`:

> We count visits and steps on this site, for example that someone started or finished the placement test, so we can fix what is confusing. We do this ourselves, with no third-party analytics or advertising trackers. Each event stores only its name, a random session ID, a few non-personal details such as the step number, and the time. It does not store your name, email, phone number, IP address or browser details. The random ID is kept in your browser and replaced after 30 days. We delete these events after 12 months.

Added to "Where it is stored and who can see it":

> We use Netlify to host the site and Resend to email us a notification when you complete the placement test. That notification includes the details you submitted.

Known gaps between this wording and the code, reported to the owner and not reworded:
- There is no page-visit event. Events are the eight funnel events listed above, so "We count visits" describes more than is recorded.
- The alert email includes the name, WhatsApp number (in the Message 1 link), goal, preferred days and times, level range and source. It does not include the email address, city, alternative phone or written answer.

Held back because the code does not behave this way: "If you arrive from a link with a source tag, such as a WhatsApp message, we keep that source in your browser for up to 30 days and, only if you agree on the enrollment form, attach it to your submission so we know how you found us." In the code, `captureAttribution` runs on every first visit, with or without a source tag. It stores the referring page and landing path as well as the tags, and keeps the first visit's values even if a later visit has a tag.

### Consent checkbox (`src/components/enroll/ReviewStep.tsx`), version `2026-10-enrollment-v3`

> I agree that FluentBridges may use the information I have submitted, my placement test results, and how I found the website to evaluate my learning needs, email me my results and contact me about lessons, as described in the privacy policy.

Leads created earlier keep `consent_version` v2 and have no attribution.
