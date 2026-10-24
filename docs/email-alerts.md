# New-lead alert email

The server emails the instructor through Resend's HTTPS API twice per lead: when the enrollment form is submitted, and when the placement test is completed. There is no SDK; `server/email.ts` calls `https://api.resend.com/emails` with `fetch`.

## What the emails contain

- **Sign-up** (form submitted), subject "New lead: {name}, test not taken yet": name, "Placement test: not taken yet", goal, location (city and country), preferred days and time, source (only when lead attribution is stored), the no-test Message 1 `wa.me` link and a link to the lead in the admin.
- **Completion** (test completed), subject "New lead: {first name}, {level range}": the same without location, with "Placement test: completed" and the level range, and the test-based Message 1.

They go only to `ALERT_EMAIL_TO`. Students are never emailed by this code.

## Behaviour

- Each type is sent at most once per lead. Before sending, the server records it in `alerts_sent` on the application with a conditional write, so retried, repeated or concurrent requests never send it twice. A send that fails is not retried.
- Leads created before this change have no `alerts_sent`. They get the completion alert if they complete the test later.
- On Netlify the send runs after the response (`context.waitUntil`), so the student never waits for it. Elsewhere it is awaited, with a 5 second timeout.
- Any failure (bad key, unverified sender, timeout, network) is logged as `[email] new-lead alert failed: <status or reason>`, and a storage failure while recording the alert as `[email] <type> alert failed: storage error`. Logs never include names, addresses or Resend's response body. The lead is saved either way.
- Off unless both `RESEND_API_KEY` and `ALERT_EMAIL_TO` are set.

## Settings (Netlify: Site configuration > Environment variables, scope Functions)

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | A Resend API key with "Sending access" only. |
| `ALERT_EMAIL_TO` | Where alerts go. |
| `EMAIL_FROM` | Optional. Defaults to `onboarding@resend.dev`. |

`onboarding@resend.dev` is Resend's shared test sender and **delivers only to the email address of your Resend account**. To start today, set `ALERT_EMAIL_TO` to that address. To send to any address, verify a domain as below.

Changing these needs a redeploy. Set them for Production. For deploy previews, either leave them unset or use a separate key, so preview test leads don't look like real ones.

## Verifying a mail subdomain

Use a subdomain such as `mail.fluentbridges.com`, so sending reputation stays separate from the main domain and nothing changes for any existing email on `fluentbridges.com`.

1. In Resend, open **Domains > Add domain** and enter `mail.fluentbridges.com`. Pick the region closest to you (for example EU, Ireland).
2. Resend shows three records. Copy the exact values from the dashboard; the names below are what they look like:
   | Type | Name (host) | Value | Purpose |
   |---|---|---|---|
   | MX | `send.mail` | `feedback-smtp.<region>.amazonses.com`, priority 10 | Bounce handling |
   | TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` | SPF |
   | TXT | `resend._domainkey.mail` | the long `p=...` key from Resend | DKIM |
3. Add them where the DNS for `fluentbridges.com` is managed (Netlify DNS, or your registrar). Most DNS panels add the root domain to the name for you, so enter `send.mail`, not `send.mail.fluentbridges.com`. Don't change the existing MX records on `fluentbridges.com`.
4. Optional but recommended: a DMARC record, TXT on `_dmarc.mail` with `v=DMARC1; p=none;`. Tighten to `p=quarantine` once reports look clean.
5. Back in Resend, press **Verify DNS records**. It usually takes minutes, occasionally up to a few hours.
6. Set `EMAIL_FROM` to `FluentBridges <alerts@mail.fluentbridges.com>` and redeploy.

## Checking it

1. Set the three variables on a deploy, then finish the placement test with a made-up lead.
2. The alert should arrive within a minute. If not, open **Logs > Functions > enrollment-api** in Netlify and look for `[email] new-lead alert failed`, and check **Emails** in Resend.
3. A `status 403` usually means the sender isn't verified, or `onboarding@resend.dev` is sending to an address other than the account's own.
