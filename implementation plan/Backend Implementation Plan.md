# Backend Implementation Plan

## Goal

Deliver the contract-authoritative Django Ninja backend for rental and vehicle sales, including transactional availability, pricing, bookings, payments, refunds, operations, media, jobs and Django admin. The backend owns `/contract/openapi.json` and all authoritative business state.

## Non-negotiable implementation rules

- Every HTTP-exposing Django domain app contains `api/__init__.py`, `api/serializers.py`, `api/views.py` and `api/urls.py`.
- `api/serializers.py` contains explicit Ninja/Pydantic request and response schemas.
- `api/views.py` contains thin transport handlers that delegate to application/domain services.
- `api/urls.py` owns or exports that app's Ninja router. `config/urls.py` only composes routers at versioned prefixes.
- Do not create a project-wide domain-views module and do not expose ORM models as implicit response schemas.
- Format backend Python with `ruff format` and lint it with `ruff check`. Run both after edits and require `ruff format --check` and `ruff check` to pass before completion and in CI.
- The backend computes all money and availability; requests never supply authoritative totals.
- External provider calls, email and media processing do not run inside database transactions.
- Financial, booking, inspection and audit records are retained according to policy; no unsafe hard deletion.
- Unapproved commercial/legal behavior remains configurable and disabled.

## Planned backend structure

```text
backend/
  manage.py
  pyproject.toml
  requirements/
    runtime.txt
    development.txt
    test.txt
    README.md
  config/
    settings/
      __init__.py
      base.py
      local.py
      production.py
      test.py
    api.py
    urls.py
    asgi.py
  apps/
    contract/
      api/
      errors.py
      pagination.py
      security.py
    fleet/
      api/{__init__,serializers,views,urls}.py
      models.py
      services.py
      selectors.py
      admin.py
      tests/
    locations/
    pricing/
    availability/
    bookings/
    payments/
    refunds/
    accounts/
    inspections/
    maintenance/
    media/
    sales/
    jobs/
    audit/
  tests/
    contract/
    integration/
    concurrency/
```

Each listed domain app that exposes HTTP follows the same `api/` package rule. Internal-only apps may omit routes but still keep service boundaries explicit.

Settings responsibilities are fixed: `base.py` contains shared environment-neutral defaults; `local.py`, `production.py` and `test.py` import the base settings and apply only their environment-specific overrides. Production and test entrypoints select their settings module explicitly and never fall back to local settings.

Dependency responsibilities are fixed: `runtime.txt` contains deployed runtime dependencies; `development.txt` includes runtime and adds local tooling; `test.txt` includes runtime and adds test and contract-verification tooling. `requirements/README.md` documents the inclusion graph, installation commands, pinning/update policy and environment-to-file mapping. No duplicate monolithic requirements file is kept at the backend root.

## Delivery sequence

### B0 — Architecture, scaffold and complete contract

- Scaffold Django with `config/settings/{base,local,production,test}.py`, the `requirements/{runtime,development,test}.txt` dependency groups and `requirements/README.md`; add the Granian entrypoint, Postgres connection modes, structured logging and environment validation.
- Create domain apps and their per-app `api/` packages.
- Define the shared error envelope, UUID/timestamp/money conventions, pagination, auth declarations, idempotency metadata and cache conventions.
- Brainstorm all public, customer, staff-browser, provider, media-worker and job-runner journeys.
- Implement Django Ninja schemas and stub handlers with stable operation IDs and realistic examples.
- Export `/contract/openapi.json`; create `/contract/NOTES.md` and `/contract/CHANGELOG.md`.
- Add spec regeneration, linting, breaking-change detection, Schemathesis and stale-output checks to CI.

Exit gate: all guide journeys trace to documented operations; the frontend can generate types and run every required flow against Prism; both sides approve the contract.

### B1 — Core data model, admin and seed data

- Implement shared UUID/timestamp foundations and migrations.
- Implement Branch, Vehicle, translations, category/reference data and VehicleMedia metadata.
- Implement Unfold configuration, role groups and least-privilege permissions through data migrations.
- Add representative bilingual seed data and deterministic factories.
- Add constraints and indexes from the guide, including archive/deactivation behavior.

Exit gate: fleet data can be managed in admin and returned by localized contract endpoints without N+1 queries.

### B2 — Pricing and transactional availability

- Implement versioned RatePlan and FeeRule models with explicit priority/overlap validation.
- Implement pure integer-XAF quote functions and approved default settings.
- Implement AvailabilityBlock and BookingHold using the selected Postgres overlap strategy.
- Implement fleet search, availability search, quote create/retrieve/expiry and ETag-aware public reads.
- Add concurrent transaction tests on Postgres, time-boundary tests and query-count budgets.

Exit gate: conflicting holds/bookings cannot both succeed; quote calculation is deterministic and fully itemized.

### B3 — Booking, payment and webhook foundation

- Implement Booking and immutable BookingSnapshot records and state transitions.
- Implement IdempotencyRecord and endpoint-scoped replay/conflict semantics.
- Implement provider-neutral payment types and a deterministic fake provider.
- Implement Payment and PaymentEvent persistence, sensitive-field masking and reconciliation metadata.
- Implement booking creation as: validate/recompute, lock/recheck, create hold/snapshot/payment attempt, commit, then invoke provider.
- Implement bounded webhook verification/finalization with dedupe, authoritative lookup, amount/reference/kind checks and row locks.
- Implement retry-payment and balance-payment flows.

Exit gate: fake-provider E2E, duplicate submission, forged/repeated/out-of-order callback and late-success scenarios pass.

### B4 — Notch Pay verification and adapter

- Verify current official Notch Pay authentication, `cm.mobile` charge request, supported operators, status lookup, webhook authenticity and refund capability.
- Record verified facts, unknowns and test evidence in the guide and `/contract/NOTES.md`; propose contract changes if required.
- Implement the async adapter with a shared `httpx.AsyncClient`, bounded timeouts, redacted logs, typed errors and retries only where safe.
- Run the common provider conformance suite against fake and Notch Pay test mode.

Exit gate: test-mode charge and reconciliation paths are demonstrated; unsupported features remain disabled rather than simulated.

### B5 — Authentication, accounts and consent

- Implement session auth, CSRF, login/logout/me, neutral registration, verification and password reset.
- Implement optional account creation during booking and safe guest lookup.
- Implement consent records and terms-version conflicts.
- Implement account deactivation, session invalidation, data export and restricted deactivated-user access.
- Add throttling, generic auth failures, strong hashing, expiring hashed tokens and cookie/CORS/CSRF domain tests.

Exit gate: auth and private-data access pass security tests across representative frontend/API domains.

### B6 — Cancellation, extensions and refunds

- Implement staff-reviewed cancellation until an approved automatic policy exists.
- Implement extension quote/confirmation with a fresh transactional availability check.
- Implement Refund and RefundRequest, single-use hashed claim tokens, expiry, original-destination enforcement and reconciliation.
- Add audited admin actions for review, approval and claim-link reissue.
- Keep the security-deposit mechanism disabled until provider capability and policy are approved; implement only the ledger foundation.

Exit gate: double claims cannot duplicate refunds; expired, failed and uncertain provider states recover safely.

### B7 — Rental operations

- Implement inspection templates/reports, odometer, fuel/battery, accessories, acknowledgements and private evidence relationships.
- Implement guarded pickup and return services using centralized transition rules.
- Implement MaintenanceBlock and vehicle retirement/unavailability behavior.
- Implement incident/dispute handling, restricted evidence access and DocumentAccessLog.
- Keep late, mileage, fuel, cleaning and damage charges disabled until approved; pure functions and tests may be prepared behind settings.

Exit gate: invalid transitions and maintenance conflicts are rejected; every sensitive read and override is authorized and audited.

### B8 — Vehicle sales

- Implement SaleListing, SaleInquiry, TestDriveBooking, SaleReservation, VehicleDocument and OwnershipTransfer.
- Enforce rental/sale mutual exclusion and one active reservation per listing with database constraints and row locks.
- Reuse AvailabilityBlock for test drives and the provider interface for reservation deposits.
- Implement reservation expiry, late-payment review/refund handling and guarded sale completion.
- Add Unfold sales pipeline, document restrictions and ownership-transfer checklist.

Exit gate: concurrent buyers cannot reserve the same listing; sold/reserved vehicles cannot leak back into rental availability.

### B9 — Media and private documents

- Configure R2 clients and object-key policies for private originals, public derivatives and private evidence/documents.
- Implement scoped upload intents, completion verification, MIME/magic-byte/dimension/duration/size/checksum validation and audit.
- Implement job-driven image/video derivatives with idempotent manifests, retries and orphan reconciliation.
- Expose only approved renditions publicly; issue short-lived authorized access for private objects.
- Strip public EXIF/GPS metadata and keep processing out of request handlers.

Exit gate: malformed uploads fail safely; no private key/original appears in public responses; missing/orphan objects are detectable and recoverable.

### B10 — Jobs, email and observability

- Implement the Postgres jobs/outbox queue with `skip_locked`, bounded batches, backoff and idempotent handlers.
- Implement secured `/internal/jobs/run`, database-free `/healthz` and signed media-worker entrypoint.
- Implement bilingual Resend templates and immediate-after-commit attempts with outbox retry.
- Implement expiry, reconciliation, reminder, retention, purge, media and sales jobs from the guide.
- Add metrics/alerts for conflicts, payments, webhooks, refunds, jobs, media, database health and repeated auth failures with PII redaction.

Exit gate: repeated/concurrent cron invocations are safe; failed work is observable and retryable.

### B11 — Deployment, compliance and hardening

- Configure Granian/Render, Neon pooled/direct connections, migration workflow, R2, Resend and environment-separated secrets.
- Enforce security headers, body limits, timeouts, rate limits, Turnstile verification, TOTP 2FA and least privilege.
- Implement retention settings, legal holds, anonymizing purge jobs and processing-register support after policy approval.
- Run Schemathesis, integration, concurrency, authorization, query-count, load and recovery tests.
- Write and exercise migration/rollback, webhook recovery, credential rotation, breach response and joint Neon/R2 restore runbooks.

Exit gate: staging production-readiness review has no unresolved critical security, data-integrity, contract or recovery issue.

## Testing strategy

- Unit: pure pricing/fee/time functions, transitions, phone normalization, provider mappings and retention decisions.
- API: schemas, examples, auth/CSRF, localization, rate limits, error codes, cache headers and idempotency.
- Integration: Postgres constraints/transactions, R2 boundaries, Resend outbox and fake provider.
- Concurrency: booking holds, extension conflicts, test-drive slots, sale reservations and webhook/job replay.
- Contract: deterministic OpenAPI export, Schemathesis and breaking-change/staleness checks.
- Security/privacy: role matrix, masked fields, signed-object access, log redaction, Turnstile and token replay.
- Operations: job retries, provider uncertainty, backup/restore and orphan reconciliation.

## Contract and collaboration gates

1. Contract freeze before domain implementation.
2. Fleet/media schema review before public browse implementation.
3. Availability/quote behavior review before booking forms.
4. Fake-provider E2E before Notch Pay test-mode integration.
5. Auth cookie/CSRF validation on real-shaped domains before account UI completion.
6. Sales concurrency review before reservation UI completion.
7. Staging security, accessibility, performance and recovery review before production.

Any breaking contract change requires a changelog entry and frontend/backend sign-off. Additive changes still require regenerated spec and types.

## Backend definition of done

- The approved OpenAPI contract is complete, current and generated from code.
- Every HTTP-exposing app follows the required `api/serializers.py`, `api/views.py`, `api/urls.py` structure.
- All authoritative money, inventory and transition decisions execute server-side.
- Postgres concurrency and integrity tests pass for rental and sales.
- Provider/webhook/refund/job retries are idempotent and observable.
- Admin permissions, sensitive-field masking, document/media privacy and audit requirements pass.
- Deployment and joint database/media recovery runbooks have been tested.
- Unresolved legal or commercial decisions remain explicit, configurable and safely disabled.
