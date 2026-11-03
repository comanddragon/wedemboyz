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

Keep the existing authenticated `POST /internal/jobs/run` scheduler running at least
once per minute. API requests persist work in the Postgres job outbox; without the
runner, mail remains queued. Inspect failed jobs in the Django admin and their
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
- Collection/delivery schedules: initial booking, rescheduling, and progress changes.
- Order status transitions: confirmed, in progress, ready, out for delivery,
  delivered, cancelled. Each history entry creates a separate event snapshot.
- Payment success: receipt, amount, method, reference and date. Failure: payment
  unsuccessful. Email delivery is independent of the receipt SMS task.
- Refund request/status transitions: pending, approved, rejected, processed.
- Subscriptions: activated, renewed, automatic renewal disabled, cancelled, expired.
  The daily expiry sweep saves each subscription so the expiry email is produced.
- Existing notifications: chat, promotions, general account/system notices,
  including inventory and finance alerts, payment and order-linked notifications.

Every purpose has an HTML template in `templates/emails/` and English/French copy
in `services/email_copy.py`; all include a plain-text alternative. The recipient's
profile language selects the locale. HTML escapes customer-provided text.
Transactional receipts, refunds, and security mail bypass the optional email
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
