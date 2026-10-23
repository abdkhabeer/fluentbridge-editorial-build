# Privacy and data retention (operational notes)

The public policy is at `/privacy` (`src/pages/Privacy.tsx`). This file records how that policy is implemented, and what still needs a human decision or legal review. **Nothing here is a claim of legal compliance.**

## Retention rules

| Data | Rule | Implemented by |
|---|---|---|
| Prospective-student application, assessment, writing (any status except `enrolled`) | Deleted automatically **12 months** after last activity: the later of the application's and the assessment's `updated_at`. Instructor edits count as activity. | `runRetention()` in `server/api.ts`, run daily by `netlify/functions/retention-cleanup.mts` (production only) |
| Enrolled students (`lead_status = enrolled`) | **Not** deleted automatically. Review manually and delete **24 months** after the last lesson unless a legal or accounting reason applies. | Manual: the dashboard's "Delete this lead" |
| Student access token | Stops working **30 days** after applying. The index is deleted by the daily job. | `ACCESS_TTL_DAYS`, `loadIndex()`, `runRetention()` |
| Daily per-IP application counters (hashed) | Deleted after 2 days | `runRetention()` |
| Contact-form messages (Netlify Forms) | Review and delete **at least every 12 months** | Manual, in the Netlify UI under Forms |
| Anonymous funnel events (`events/`) | Deleted after **12 months** | `runRetention()`. See `docs/analytics.md` |
| Browser storage | Contact details are cleared after submission and test progress after completion. "Remove my data from this device" clears everything and revokes the token. | `src/lib/enrollment/storage.ts`, `Enroll.tsx` |

The periods live in `src/lib/enrollment/policy.ts`. Change them there and update the privacy page text if the wording changes.

If a lead has an ongoing conversation that justifies keeping it, any instructor edit (status or note) resets the 12-month clock.

## Requests from students

- **Correction:** open the lead in `/instructor`, then use "Correct details". The new details are validated, and phone numbers are normalised.
- **Deletion:** open the lead and use "Delete this lead" (type the name to confirm). This removes the application, assessment, writing and access token. Also delete any matching contact-form submissions in Netlify Forms.
- **Copy of their data:** the lead page shows everything stored. Send it to the student over the channel they used.
- **Verification:** confirm the request from the WhatsApp number or email the student applied with.

## Decisions and legal review still needed

These need a decision by Fluent Bridges, ideally with a qualified adviser for each jurisdiction where students live:

1. **Applicable law:** for example Egypt's Personal Data Protection Law (Law No. 151 of 2020) and its executive regulations, and the GDPR or UK GDPR for students in Europe or the UK. That includes whether any registration, licensing or appointment requirements apply.
2. **Cross-border transfer:** data is stored by Netlify (US) and fonts load from Google. Confirm this is acceptable, and whether a transfer basis or notice wording is required.
3. **Controller identity:** the policy names Fluent Bridges and its instructor as shown on the site. Confirm whether a legal business name or registered address must be published.
4. **Minors:** the policy asks under-18s to involve a parent or guardian. Decide whether to accept under-18 applicants and whether to add an age question.
5. **Response time:** the policy says "we aim to respond within 30 days". Confirm this commitment.
6. **Retention periods:** confirm 12 months (prospects) and 24 months after the last lesson (enrolled), including any accounting or tax obligations for paying students.
7. **Statements:** confirm every statement in the policy matches actual practice, including "we don't sell your information or use it for advertising" and "only your instructor can view applications".
8. **Netlify:** review its data processing terms and subprocessors.
