# Enrollment funnel and instructor dashboard

Routes:
- `/enroll`: student details, then review and consent, then the placement test, then results.
- `/instructor`: password-protected lead management.
- `/privacy`: the privacy policy.

Related docs: [placement-scoring.md](placement-scoring.md), [privacy-and-retention.md](privacy-and-retention.md), [deploy-preview.md](deploy-preview.md).

## Architecture

A static Vite + React SPA on Netlify, with Netlify Functions and Netlify Blobs.

| Piece | Where |
|---|---|
| Pricing (single source of truth) | `src/data/pricing.ts`: prices per location (Cairo EGP; Saudi Arabia SAR, United States USD and United Kingdom GBP derived from `HARD_CURRENCY_LIST_PRICE` and `PLAN_DISCOUNTS`; trial prices in `TRIAL_PRICES`), the location rules, and inquiry copy. Used by `PricingSection`, the FAQ, the contact form, the funnel, and the server-side price snapshot |
| Validation (client + server) | `src/lib/enrollment/schema.ts` (zod), `phone.ts`, `flags.ts` |
| Data-handling periods | `src/lib/enrollment/policy.ts`, enforced by the server and shown on the privacy page |
| API (framework-agnostic `Request → Response`) | `server/api.ts` |
| Store selection per deploy context | `server/runtime.ts`, `server/netlify.ts` |
| Storage interface (ETag conditional writes) | `server/store.ts`, with Blobs, file (dev), and memory (tests) implementations |
| Netlify Functions | `netlify/functions/public-strict.mts`, `enrollment-api.mts`, `instructor-api.mts`, `retention-cleanup.mts` (scheduled) |
| Local dev API | `server/devPlugin.ts` (Vite dev server only) |
| Security headers | `public/_headers` |
| Build config | `netlify.toml` (`npm run build`, publish `dist`). npm is the only package manager (`package-lock.json`). |

### Location-based pricing

- The pricing section's location selector defaults to Cairo (or the visitor's last choice, or the country on an enrollment form in progress). It never uses IP.
- In the funnel, the location comes from step 1: `regionForLocation(country, city)`. Egypt counts as Cairo only when the city matches Cairo or a Cairo Governorate district (`isCairoCity`); Giza is "elsewhere in Egypt".
- `packageLocationError` lets a student choose only their own location's prices. The funnel and the server (`parseApplication`) both apply it, so a 422 is returned for another location's package.
- Student English is shown only after "I'm a school or university student" is ticked (`is_student` on the application; older records lack it and read as false). The funnel and `parseApplication` both reject a `student-*` package without it. The goal hint suggests Business English for business goals and Professional English for everything else, or Student English when the box is ticked.
- Locations without published prices (elsewhere in Egypt, other countries) can choose "I need help choosing"; the lead gets the `pricing_quote_needed` review flag.
- Price snapshots now include `currency`, `price`, `billing` and `classes_per_week`. `price_egp` is set for EGP only. Snapshots saved before this change have no `currency` and are read as EGP.
- Pricing CTAs open the contact form with `?inquiry=egypt-pricing|uk-pricing|consultation`. New contact fields must also be added to the hidden form in `index.html`, or Netlify Forms drops them.
- Hard-currency prices: single lessons cost `HARD_CURRENCY_LIST_PRICE[currency]`; 12- and 20-class 4-week plans are discounted by `PLAN_DISCOUNTS` (5% and 10%). GBP plans use placeholder overrides (170 and 265) in `PLAN_PRICE_OVERRIDES`. Per-class prices and "Save" amounts are computed.
- Founding rate: set `HARD_CURRENCY_FOUNDING_RATE` in `src/data/pricing.ts` to `{ endsOn: "YYYY-MM-DD", note?: "..." }` to show "Founding rate until {date}." under the Saudi Arabia, United States and United Kingdom plan cards. It disappears by itself after `endsOn`. Unset by default.

### Deploy-context isolation (`server/runtime.ts`)

| `context.deploy.context` | Store | Instructor credentials |
|---|---|---|
| `production` | site-wide `enrollment-production` | `INSTRUCTOR_PASSWORD`, `INSTRUCTOR_SESSION_SECRET` |
| `deploy-preview`, `branch-deploy`, `preview-server` | **deploy-scoped** `getDeployStore("enrollment-preview")`, so every preview deploy gets its own empty store | `PREVIEW_INSTRUCTOR_PASSWORD`, `PREVIEW_INSTRUCTOR_SESSION_SECRET`. Refused if they equal the production values. |
| `dev` (netlify dev / serve) | site-wide `enrollment-dev` in the local sandbox | `PREVIEW_*` |
| anything else or missing | **none**: every API call returns 503 | none |

Two guarantees follow:
- **No fallback.** If the deploy store can't be opened, the API returns 503; it never falls back to the production store.
- **Preview code can't reach production through this app.** Netlify gives every deploy of a site the same Blobs access, though, so a deliberately modified preview build could still call `getStore("enrollment-production")`. Only merge reviewed code.

### Data model (Blobs keys)

None of these keys contain personal data.

- `applications/<uuid>`: the application. Contact details, goals, `group_status`, preferences, the price snapshot, consent timestamp and version, `lead_status`, `review_flags`, `instructor_notes`, `access_expires_at`, `access_revoked_at`, and `access_token_hash`. The token hash is never returned by the API.
- `assessments/<uuid>`: status (`not_started | in_progress | writing | completed`), answers, scored responses, scores, level, writing, rubric, and feedback.
- `tokens/<sha256>`: a student access-token index holding the application and assessment ids, `created_at`, and `expires_at` (30 days).
- `instructor/session-version`: the counter that signing out increments to revoke all instructor sessions.
- `ratelimit/applications/<day>/<sha256(day+ip)>`: daily application counters, deleted after two days.

### Concurrency and integrity

- Every read-modify-write uses Blobs ETags (`onlyIfMatch`) and retries on conflict, re-checking status each time. A late autosave therefore gets a 409 instead of overwriting a submitted or completed assessment.
- **Applications:** the token index is claimed with `onlyIfNew` before any record is written, so concurrent submissions with the same token resolve to one application. Records are created with `onlyIfNew`, and the application is written first. A retry repairs a partially failed attempt; a missing assessment is recreated on the student's next request. The dashboard shows a lead even when its assessment is missing.
- **Instructor edits** must send the `application_version` / `assessment_version` they loaded. A stale version returns 409 and the dashboard offers a reload.
- **Client autosaves** wait for any request already in flight before submitting. Unsaved answers stay on the device and are retried, and the submission always carries every answer.
- **Local sandbox:** it doesn't return ETags on reads, so the adapter falls back to a stable ETag from `list()`. Production returns ETags on reads; verify this on the preview (see deploy-preview.md).

### Security

- **Student access:** a 256-bit browser-generated token sent in a header, with only its hash stored. It expires 30 days after applying and is revoked by "Remove my data from this device".
- **Instructor sessions:** HMAC-signed `HttpOnly; Secure; SameSite=Strict; Path=/api/instructor` cookies with a 12-hour expiry and an embedded session version. Signing out increments the server-side version, revoking every issued cookie. The password is compared in constant time.
- **Rate limits:** the two Netlify rules the plan allows are 10/min per IP on `public-strict` (new applications and instructor login) and 120/min per IP on `enrollment-api` (assessment saves, for students sharing one mobile-carrier IP).
- **Daily cap:** 30 new applications per IP per UTC day, enforced server-side, storing hashed values only.
- **Requests:** JSON-only bodies (415 otherwise, which blocks cross-site form posts). Per-endpoint size limits run before parsing: 16 KB applications, 8 KB answers, 16 KB writing, 1 KB login. There's also a honeypot field and text sanitisation.
- **Scoring:** done on the server; the answer key is server-only and never in the client bundle.
- **Headers:** CSP (self plus Google Fonts), `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Logs:** never contain request bodies.

## Environment variables

Set them in Netlify under Site configuration > Environment variables, with scope **Functions**.

| Name | Deploy contexts | Notes |
|---|---|---|
| `INSTRUCTOR_PASSWORD` | Production only | At least 12 characters (use 20+ random). |
| `INSTRUCTOR_SESSION_SECRET` | Production only | At least 32 random characters (`openssl rand -hex 32`). |
| `PREVIEW_INSTRUCTOR_PASSWORD` | Deploy previews, Branch deploys | Different from production. |
| `PREVIEW_INSTRUCTOR_SESSION_SECRET` | Deploy previews, Branch deploys | Different from production. |

Without these, the student funnel still works and `/instructor` shows "not configured", failing closed.

## Local development

```sh
cp .env.example .env.local   # set INSTRUCTOR_PASSWORD / INSTRUCTOR_SESSION_SECRET
npm run dev                  # http://localhost:8080 (data in .data/, gitignored)
```

Checks:
- `npm test`
- `npm run test:e2e`: Playwright on mobile and desktop, plus a CSP check against the production build.
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Not implemented / future options

- **Email:** no email provider is configured, so nothing is sent and the UI never claims an email was sent. Add one in `server/api.ts` after the records are saved, never blocking the save.
- **Automated writing feedback (AI):** not enabled. If added, it would need privacy-policy disclosure and schema validation.
- **Speaking assessment:** students are pointed to the trial lesson.
