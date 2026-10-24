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

> We count actions on this site, such as starting or finishing the placement test or clicking a WhatsApp or trial button, so we can fix what is confusing. We do this ourselves, with no third-party analytics or advertising trackers. Each event stores only its name, a random session ID, a few non-personal details such as the step number or which button was clicked, and the time. It does not store your name, email, phone number, IP address or browser details. The random ID is kept in your browser and replaced after 30 days. We delete these events after 12 months.

Added to "Where it is stored and who can see it":

> We use Netlify to host the site and Resend to email us a notification when you sign up and when you finish the placement test. Each notification includes your name, WhatsApp number, goal, preferred days and times, whether you took the test, your level once you have, and a suggested first reply, along with how you found the site if you agreed to share that.

Checked against the code (October 2026):
- Events: the eight funnel events above. `whatsapp_clicked` and `trial_cta_clicked` record where the button was (`location`), from the header, footer, contact section, call-to-action section and results page.
- Alert emails: one when the form is submitted and one when the test is completed. Each has the name, the test status, goal, preferred days and times, the Message 1 `wa.me` link (WhatsApp number and a suggested first reply), a link to the lead in the admin, and "Source:" when attribution was stored. The completion alert adds the level range. The sign-up alert adds the city and country, which the approved privacy sentence doesn't list.
- "Remove my data from this device" (results page only) clears every key in `src/lib/browserStorage.ts`: `fb-enrollment-v1`, `fb-pricing-location`, `fb-analytics-session-v1`, `fb-attribution-v1` and `fb-analytics-once-v1`.
- Saved attribution older than 30 days is deleted when the page reads it.

Added next to the analytics paragraph (approved October 2026):

> When you first visit the site, we save in your browser where you came from: the page that linked to us (when it is another website), the page you landed on, and any source tags in the link, such as utm_source and utm_campaign. We ignore this after 30 days. If you submit your details and tick the consent box, we send it with your submission, together with the random session ID, which lets us connect the steps you took on the site to your submission. You can clear it by clearing this site's data in your browser settings, or with "Remove my data from this device" on the results page.

### Consent checkbox (`src/components/enroll/ReviewStep.tsx`), version `2026-10-enrollment-v3`

> I agree that FluentBridges may use the information I have submitted, my placement test results, and how I found the website to evaluate my learning needs, email me my results and contact me about lessons, as described in the privacy policy.

Leads created earlier keep `consent_version` v2 and have no attribution.
