# Email delivery

Production uses Resend's HTTPS API through `services.email_backend.EmailBackend`.
Development prints customer mail to the console; tests use Django's in-memory outbox.
No provider SDK or extra dependency is required.

## Production setup

Set these backend environment values in your hosting provider (never in the frontend):

```dotenv
RESEND_API_KEY=<your Resend sending key>
RESEND_FROM=Wedemboyz Lavomatique <hello@wedemboyz-lavomatique.com>
EMAIL_REPLY_TO=owner@wedemboyz-lavomatique.com,dev@wedemboyz-lavomatique.com
ORDER_NOTIFICATION_EMAILS=owner@wedemboyz-lavomatique.com,dev@wedemboyz-lavomatique.com
FRONTEND_URL=https://wedemboyz-lavomatique.com
```

Add `wedemboyz-lavomatique.com` to Resend Domains. Install the SPF and DKIM records
provided by Resend in the domain's DNS, then verify the domain in Resend. Do not
invent record values or replace existing mailbox MX records. The `hello@` sender
is an outbound identity; replies are addressed to both monitored `EMAIL_REPLY_TO`
inboxes. Order alerts go to every address in `ORDER_NOTIFICATION_EMAILS`. Both
settings accept comma-separated addresses. The email footer shows the first
reply-to address (the owner) as the public contact.
Resend does not automatically create a mailbox for that address.

Run `python manage.py check_email_setup --settings=config.settings.production`.
This checks local configuration and does not send email or verify DNS remotely.

All new email jobs (including consent-checked promotions) are attempted immediately after the surrounding database
transaction commits. Only that new email job is claimed, using the same locking
and retry bookkeeping as the scheduler. A send failure does not fail signup or
roll back a completed order; the job remains queued for retry. This immediate
attempt can add up to the email transport’s 15-second timeout to a request.

The frontend Worker now includes a one-minute Cloudflare Cron Trigger that calls
`POST /internal/jobs/run` for retries, upstream notification jobs, and periodic work.
It is not active until that Worker is deployed with the server-only shared secret:

```bash
cd frontend
bun x wrangler secret put INTERNAL_JOBS_SECRET
# Enter the same INTERNAL_JOBS_SECRET configured on the Render backend.
bun run deploy:cloudflare
```

Do not put that secret in `NEXT_PUBLIC_*` variables or in the public `vars` block.
The jobs endpoint rejects a missing/mismatched secret. The scheduled handler rejects
HTTP errors, invalid response counters, and terminal job failures, making these
visible as failed Cron invocations in Cloudflare. Logs contain counters only.
Deploy the backend changes too; otherwise the immediate-send fixes and email
headers remain unchanged in production. Cron changes can take up to 15 minutes
to propagate. Keep any existing runner until the new Cron is confirmed active.
Already queued emails still require the runner; deploying this change does not
automatically send an existing backlog. Inspect failed jobs in the Django admin and their
`last_error` values. After correcting a configuration problem, requeue the existing
job rather than create another email. Resend idempotency keys protect provider
retries within its retention window; the unique job key prevents duplicate event
jobs. This is not an unlimited exactly-once delivery guarantee.

## Wired events

- Account registration and guest-account upgrades: welcome.
- Password recovery: single-use link, expires in one hour; security confirmation
  after reset or an authenticated password change. Prior refresh tokens are
  blacklisted; password-bound JWT claims reject old access tokens. Enabling this
  protection requires existing sessions to sign in again after deployment.
- Customer order submission (including quick sales): order received, with item
  summary and totals. Existing owner order mail now also includes branded HTML.
- Order submission also issues a separate itemized invoice email, once per invoice.
  It includes the invoice number, issue date, quantities, unit prices, subtotal,
  delivery fee, discount, total, paid amount and balance. Final submission pricing
  is reconciled before the invoice snapshot is queued.
- Collection/delivery schedules: initial booking, rescheduling, and progress changes.
- Order status transitions: confirmed, in progress, ready, out for delivery,
  delivered, cancelled. Each history entry creates a separate event snapshot.
- Payment success: receipt, amount, method, reference and date. Failure: payment
  unsuccessful. Email delivery is independent of the receipt SMS task.
  Successful receipts include a stable `REC-<payment id>` number and, for order
  payments, the invoice reference, item summary and current remaining balance.
  Partial payments receive individual receipts; a receipt does not imply settlement.
- Refund request/status transitions: pending, approved, rejected, processed.
- Subscriptions: activated, renewed, automatic renewal disabled, cancelled, expired.
  The daily expiry sweep saves each subscription so the expiry email is produced.
- Existing notifications: chat, promotions, general account/system notices,
  including inventory and finance alerts, payment and order-linked notifications.

Every purpose has an HTML template in `templates/emails/` and English/French copy
in `services/email_copy.py`; all include a plain-text alternative. The recipient's
profile language selects the locale. HTML escapes customer-provided text.
Transactional invoices, receipts, refunds, and security mail bypass the optional email
preference. Other customer mail respects `email_enabled`; promotional mail also
requires both `promo_opt_in` and profile `marketing_opt_in`. Inactive/deleted users,
changed recipient addresses, seed mode, absent addresses, and `.invalid` seed
addresses are skipped. Owner order mail is independent of customer preferences.

## Preview templates

```bash
python manage.py preview_emails --output /tmp/wedemboyz-email-previews
```

Open the generated index to browse every purpose in English and French. This
command never sends email.

## Recovery API

- `POST /api/v1/auth/password/reset/` with `phone_number` and `email`.
  Always returns the same successful response for matching or unknown accounts.
- `POST /api/v1/auth/password/reset/confirm/` with `uid`, `token`, and `password`.
  Uses Django password validation, expiry and single-use token checks.

Both routes are throttled to five requests per IP per hour. The existing
`/forgot-password` and `/reset-password` frontend routes now use these endpoints.
The reset page suppresses referrers and search indexing. Treat outbox payloads as
sensitive: reset URLs contain secrets, and order/receipt emails contain customer
information. Limit admin access accordingly.

References: [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction),
[Sending email](https://resend.com/docs/api-reference/emails/send-email),
[idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Domain setup performed in this workspace

On 3 November 2026 the new domain was added to Resend and these DNS records
were installed in Cloudflare using Resend’s generated values:

- TXT `resend._domainkey` (Resend’s DKIM public key).
- DNS-only CNAME `rsend` → `rsend-euw1.forge.rmta.net`.
- DNS-only CNAME `send` → `send.forge.rmta.net`.
- TXT `_dmarc` → `v=DMARC1; p=none;` (initial monitoring policy).

The existing Resend key has Sending access for All domains. A domains API lookup
is rejected for this permission level; that does not mean the sending key is
invalid. Resend confirmed the new domain as Verified and ready to send during setup.

## Logo and public assets

Every HTML template uses the shared header in `templates/emails/base.html`.
`EMAIL_LOGO_URL` defaults to `https://wedemboyz-lavomatique.com/logo.png`, the
existing public frontend asset. No bucket upload is required. Keep this URL public
and stable; do not replace it with an expiring signed URL. An image-disabled email
client sees the descriptive alt text, and all mail also includes plain text.

## Reliability checks before calling deployment complete

1. Deploy the backend with Resend credentials, sender, recipients and reply-to values.
2. Deploy the frontend Worker with the matching `INTERNAL_JOBS_SECRET`.
3. Check Cloudflare Scheduled invocations for a successful Cron run and the four
   job counters. A successful bundle build alone does not prove the runner is active.
4. Inspect pending/retry/failed jobs in Django admin. Failed jobs need investigation
   and requeueing; the scheduler does not endlessly retry permanent failures.
5. Confirm a real event reaches Resend and check its Delivered/Bounced status.
   Provider acceptance and recipient inbox placement are different outcomes.

The first welcome email was manually processed with approval and Resend reported
Delivered. No other live emails are sent by the preview commands or test suite.
Delivery cannot be guaranteed during provider outages; durable retries prevent
transient failures from being silently discarded. Image loading remains subject
to the recipient email client’s privacy settings.

## Transactional sending subdomain migration

The intended sender is `Wedemboyz Lavomatique <notifications@updates.wedemboyz-lavomatique.com>`.
Keep order recipients and reply-to addresses on the root domain (`owner@` and `dev@`).
Verify `updates.wedemboyz-lavomatique.com` separately in Resend before changing
`RESEND_FROM` in Render or local production env files. This does not create a mailbox.

At setup, the account already used all three domain slots. Adding `updates` was
blocked by the plan limit; no paid upgrade was made and the active sender was
left unchanged. Removing the legacy `wedemboyz-lavomatique.ntsemancho.online`
sending domain requires owner approval. Keep the currently verified root domain
until the new subdomain is verified and deployed. Future bulk marketing should
use a separately verified marketing subdomain to isolate it from transactional mail.

The checked-in `frontend/wrangler.example.jsonc` includes the custom entry point,
retry endpoint and one-minute schedule. The actual `frontend/wrangler.jsonc` is
ignored by Git; it was updated locally too. For a fresh checkout, copy the example
to `wrangler.jsonc` and select your account, then configure the secret before deploy.
