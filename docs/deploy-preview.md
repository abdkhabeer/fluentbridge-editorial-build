# Deploy preview runbook

Use this to launch an isolated Netlify deploy preview and verify the funnel before collecting real student data. Previews use a deploy-scoped Blobs store and separate instructor credentials (see `docs/enrollment-funnel.md`).

## 1. One-time Netlify settings

1. **Build settings** (Site configuration > Build & deploy): `netlify.toml` now sets the build command to `npm run build`, the publish directory to `dist`, and the functions directory to `netlify/functions`. File-based settings override the UI. Check nothing else in the UI conflicts, such as a custom base directory.
2. **Environment variables** (Site configuration > Environment variables), each scoped to **Functions**:

   | Variable | Deploy context | Value |
   |---|---|---|
   | `INSTRUCTOR_PASSWORD` | Production only | 20+ random characters |
   | `INSTRUCTOR_SESSION_SECRET` | Production only | `openssl rand -hex 32` |
   | `PREVIEW_INSTRUCTOR_PASSWORD` | Deploy Previews and Branch deploys | Different random value |
   | `PREVIEW_INSTRUCTOR_SESSION_SECRET` | Deploy Previews and Branch deploys | Different `openssl rand -hex 32` |

   Use "Different value for each deploy context" and **leave the production context empty** for the `PREVIEW_*` variables. Don't give previews the production values.
3. **Forms** (Site configuration > Forms): confirm form detection is enabled and the existing `contact` form is listed.

## 2. Create the preview

Commit the changes on a branch, push it, and open a pull request. Netlify builds a Deploy Preview, and the build log should show:
- `npm install` (not `bun install`) and `npm run build`
- four functions bundled: `enrollment-api`, `instructor-api`, `public-strict`, `retention-cleanup`
- the `_headers` and `_redirects` files processed

In the Netlify UI, under Project configuration > Rate limiting (or the deploy's Functions tab), confirm the two code-based rules: `public-strict` at 10/60s and `enrollment-api` at 120/60s.

## 3. Verify on the preview URL

Use made-up test data only.

**Isolation and configuration**

1. `curl -s https://<preview>/api/instructor/session` returns JSON (`{"authenticated":false}`), not HTML. This shows functions take precedence over the SPA rewrite.
2. `curl -sI https://<preview>/` shows `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy`.
3. Signing in to `/instructor` with the **production** password fails. Signing in with the **preview** password works.
4. Submit one test application on the preview. In the Netlify UI under Blobs, the site-wide `enrollment-production` store must not exist or must stay empty. The preview's data sits in a deploy-scoped store.

**Student journey (one Android and one iPhone)**

5. Complete `/enroll`:
   - Refresh mid-test and confirm it resumes at the same question.
   - Toggle airplane mode for a few answers, then reconnect and confirm they sync.
   - Finish the writing task and check the results page.
   - Check that the WhatsApp button opens WhatsApp with the first name and level only.
6. **Race checks.** These confirm the server returns ETags on reads in production.
   - Answer quickly and click "Continue to the writing task" within a second.
   - Type in the writing box and submit immediately.
   - Refresh after each; the status and results must hold.
7. Double-tap "Continue to English Placement Test" on a throttled network. The dashboard shows exactly one application.
8. Click "Remove my data from this device" on the results page. Reopening `/enroll` shows a blank form, and the dashboard still shows the lead with "Removed from student's device".

**Instructor**

9. Open the same lead in two tabs, save notes in one, then save in the other. The second tab shows "changed elsewhere" with a reload option.
10. Sign in on two browsers, sign out on one, and refresh the other. It must require sign-in again.
11. Try 11 wrong passwords within a minute. The 11th gets a 429 (the strict rule allows 10 requests a minute, shared with new applications).
12. Correct a test lead's contact details, then delete the lead.

**Existing site**

13. Submit the contact form with test data. A success toast appears, and the entry shows up under Netlify Forms.
14. In Pricing, switch between every location. Cairo, Saudi Arabia and the US show their prices; the others show a request button that opens the contact form with the request type and country filled in. Send one UK pricing request with test data (WhatsApp only) and confirm it appears under Netlify Forms with `request_type`, `country` and `currency`.
15. Check that the pricing buttons open `/enroll` with the right package preselected, that `/privacy` loads from the footer on mobile, and that the browser console shows no CSP errors.

**Funnel and pricing (fix/funnel-and-pricing)**

16. `curl -sI https://<preview>/no-such-page` returns `404`; `/enroll` and `/instructor/funnel` return `200`. `/sitemap.xml` and `/robots.txt` load.
17. Finish a test lead. Within a minute the lead list shows "waiting 0 min" (amber after 5 minutes). Message 1 opens WhatsApp with the message filled in and sets the lead to Contacted.
18. `/instructor/funnel` shows the test visitor at each step.
19. Pricing: US $20 / $228 / $360, Saudi Arabia 75 / 855 / 1,350 SAR, UK 15 / 170 / 265 GBP, each with a trial card.
20. The results page shows a level range and "Book my trial". Without `BOOKING_URL` it opens WhatsApp.

## 4. After testing

- Delete preview test leads from the preview dashboard. Deploy-scoped preview data doesn't affect production either way.
- The retention job runs only on the published production deploy. After launch, check the function logs for a daily `[retention]` line.
- Before collecting real data, work through `docs/privacy-and-retention.md` under "Decisions and legal review still needed".
