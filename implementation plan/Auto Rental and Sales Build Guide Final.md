# Auto Rental and Sales Platform Build Guide and Prompts (Final)
## Next.js, Django Ninja, Neon Postgres, Notch Pay, Cloudflare R2, OpenNext

**Purpose:** Build a production-oriented, bilingual, mobile-first vehicle rental **and vehicle sales** platform using the same core stack and contract-first workflow as the ecommerce guide. This guide is the shared source of decisions for the backend and frontend agents.

**Stack:** Next.js App Router + TypeScript + Tailwind CSS on Cloudflare Workers via OpenNext; **Bun as the frontend package manager and local JavaScript/TypeScript runtime**; Django Ninja (async API) served by Granian on Render; Neon Postgres; Notch Pay mobile money in XAF behind a provider interface; Cloudflare R2 for originals and generated media; Resend for email; Django admin with Unfold; Postgres-backed jobs drained by a secured Cloudflare Cron Trigger. Verify current framework/adapter compatibility before implementation.

## How to read this guide

Every rule falls into one of three classes:

- **Confirmed:** fixed for v1. Change only through the contract process.
- **Proposed default:** a starting value, implemented as a *setting*, never a constant. Defaults in the "Confirmed defaults" table are owner-confirmed; any other proposed default stays disabled until approved.
- **OWNER DECISION:** a legal/commercial policy AI must not invent. It blocks the related workflow.

Once the contract is approved, `/contract/openapi.json` and `/contract/NOTES.md` are the source of truth; the endpoint tables here are first-draft intent that may differ in small names.

---

# Guide: Decisions

| Area | Decision |
|---|---|
| Frontend | Mobile-first Next.js App Router, TypeScript, Tailwind CSS, TanStack Query (server state), Zustand (small client state); Bun is the required package manager and local runtime; OpenNext on Cloudflare Workers |
| Visual design | `implementation plan/Visual Design Specification.md` defines hierarchy, tokens, components, interaction character and visual QA criteria. Trust-first, image-led fleet presentation. Reference sites are inspiration, not code or copy |
| API | Django Ninja, Pydantic schemas, OpenAPI 3 as the single frontend/backend contract |
| App server | Granian serving Django over ASGI on Render |
| Back office | Django admin with Unfold; no separate Next.js admin |
| Database | Neon Postgres via Django ORM; pooled runtime URL, direct URL for migrations |
| Payments | **Notch Pay** mobile money (MTN/Orange via `cm.mobile`), XAF integer amounts, direct charge, behind a provider-neutral interface (see Provider interface). Notch Pay and pawaPay remain possible fallback adapters. Fake provider for dev/tests |
| Currency | XAF only; integer amounts, never floats |
| Languages | English and French; default French; localized storefront, content, emails and errors |
| Time | Instants stored in UTC; operations and display use Africa/Douala (UTC+1, no daylight saving) |
| Rental model | Vehicle-based rental by start/end date-time, branch pickup/return workflow |
| Business scope | **Two modules on one platform: car rental and car sales.** Shared fleet/vehicle records, media pipeline, accounts, payments, refunds, jobs, localization and admin. Storefront has clearly separate Rent and Buy sections |
| Sales model | Online catalog, inquiries, test drives and a refundable-by-policy **reservation deposit** via Notch Pay that takes a single-unit listing off the market for a limited period. The purchase itself (balance, paperwork, handover) completes at the branch. See Guide: Vehicle sales. Details are proposed defaults pending owner approval |
| Vehicle assignment | Confirmed: customer books a **specific vehicle** (simplest correct model for overlap prevention). Category-only booking with later assignment is out of scope until the owner approves it |
| Availability | Server-authoritative; transactional holds; maintenance blocks; DB-level overlap prevention |
| Pricing | Server-calculated quotes from versioned rate plans; quote expiry; no client-supplied amounts |
| Customers | Guest booking plus optional account creation; neutral registration (same response for new/existing emails) |
| Payment plans | Booking payment (deposit or full, owner-approved) plus rental balance; separate security-deposit ledger |
| Security deposit | Separate ledger from revenue. Mechanism is an OWNER DECISION constrained by verified Notch Pay capability |
| Vehicle operations | Pickup/return checklists, odometer, fuel level, condition, timestamped private evidence |
| Storage | Cloudflare R2 (S3 API). Private originals/evidence/documents; public approved derivatives on a custom media domain |
| Media pipeline | Direct-to-R2 upload intents, validation, queued transformation, WebP/AVIF images, WebM/MP4 video, posters/thumbnails |
| Email | Resend called by backend |
| Jobs | Postgres jobs/outbox drained by secured Cloudflare Cron Trigger; no Celery/Redis. Media transcoding is the one explicit exception (separate FFmpeg-capable worker) |
| Session | Cookie-based; the browser calls Django directly |
| Security | Turnstile on public writes, rate limits, required email verification, staff TOTP 2FA, refunds only to original payer number, account deactivation instead of deletion |
| Compliance | Cameroon laws 2024/017 (personal data), 2010/021 (e-commerce), 2011/012 (consumer protection) turned into build rules in Guide: Compliance. Counsel review before launch |
| Repo | Monorepo: `/contract`, `/frontend`, `/backend` |
| Out of scope until approved | Multi-currency, driver marketplace, owner payouts, native apps, live GPS/telematics, automated license/ID verification, insurance underwriting, loyalty, promo codes, dynamic pricing, abandoned-booking marketing, profiling |

## Confirmed defaults (settings)

**Status: confirmed by the owner (13 Oct 2026).** These are the v1 values agents build and test against. They remain configurable *settings*, never constants, and are recorded in `/contract/NOTES.md`. Items that still depend on outside facts (security-deposit mechanism, refund eligibility, legal wording) stay gated as noted.

| Setting | Proposed default |
|---|---|
| Billing unit | 24-hour periods from pickup instant; partial period rounds up after a configurable grace (default 60 min) |
| Min / max duration | 1 day / 30 days |
| Quote expiry | 15 minutes (quote does not reserve inventory) |
| Booking hold length | 15 minutes, created at booking creation |
| Booking payment | Deposit of 30% of rental total (rounded up to whole XAF) to confirm; balance due at pickup, online payment allowed up to pickup |
| Buffer between bookings | 120 minutes preparation/cleaning buffer, per branch override |
| Cancellation | Staff-reviewed requests until the refund schedule is approved; no automatic refunds |
| Refund claim link lifetime | 3 days; after that a manual request goes to admin review |
| Late return grace | 60 minutes; penalties disabled until approved |
| Security deposit | Disabled in the API flow until mechanism approved (see Pricing, payments, deposits) |
| Reminder schedule | Pickup reminder 24 h and 2 h before; return reminder 3 h before; overdue alert at grace end |
| Cron cadence | Every 10 minutes (media/webhook gaps may justify tighter) |

## Owner decisions required before launch

Record answers in `/contract/NOTES.md` and configuration, never scattered constants:

- Minimum/maximum duration; partial-day or hourly rentals; operating hours; buffer times.
- Booking deposit amount or percentage; when the balance is due; whether online balance payment is mandatory.
- Security-deposit amount by vehicle/class, mechanism (collect/refund versus supported authorization), release timing, deduction process.
- Cancellation and no-show windows, refund schedule, date-change rules, administrative exceptions, and whether any part of the booking deposit is non-refundable (needs counsel on consumer-protection lawfulness).
- Late-return grace and penalties, extensions, and conflict handling with the next booking.
- Mileage allowance, excess rate, fuel policy, cleaning fees, driver age/experience, additional-driver policy.
- Required identity/driver documents, who accesses them, retention period and legal basis.
- Damage dispute process, inspection sign-off, evidence retention.
- Delivery/collection fees, branches, geographic coverage.
- Insurance terms, liability, taxes (how prices and tax must be displayed), consumer terms, privacy/retention and Cameroon requirements. Obtain legal review.
- Whether a vehicle is assigned at booking or only a category is guaranteed.
- Media processing provider/budget and maximum upload size/duration.
- Vehicle sales: see "Sales owner decisions" in Guide: Vehicle sales.

---

# Guide: Repository layout and contract workflow

```text
/contract
  openapi.json            # generated by backend, committed
  CHANGELOG.md            # one line per contract change
  NOTES.md                # state machines, error catalog, rate limits, caching, decisions, open questions
/frontend
  package.json
  bun.lock                 # committed; no npm/yarn/pnpm lockfiles
  src/api/schema.d.ts     # generated, never hand-edited
/backend
  config/
    settings/
      __init__.py
      base.py              # shared, environment-neutral settings
      local.py             # local development settings
      production.py        # deployed production settings
      test.py              # deterministic automated-test settings
  requirements/
    runtime.txt            # production/runtime dependencies
    development.txt        # runtime plus local development tooling
    test.txt               # runtime plus test/contract tooling
    README.md              # dependency groups, install commands and update policy
  apps/
    contract/             # shared contract primitives only
    fleet/
      api/
        __init__.py
        urls.py           # app-owned Ninja router and route registration
        serializers.py    # explicit request/response schemas
        views.py          # thin HTTP handlers; delegates to services
    locations/
      api/                # same urls/serializers/views structure
    pricing/
      api/                # same structure for every HTTP-exposing app
    availability/ bookings/ payments/ inspections/ maintenance/
    accounts/ media/ audit/ jobs/
```

**Per-app API layout.** Every backend domain app that exposes HTTP operations has an `api/` package with `urls.py`, `serializers.py` and `views.py`. `serializers.py` holds explicit Ninja/Pydantic request and response schemas; `views.py` holds thin handlers that delegate to domain services; `urls.py` owns or exports the app's Ninja router. `config/urls.py` only composes app routers at contract-defined prefixes. No business logic in API modules, no ORM models as implicit response schemas, no second project-wide collection of domain views.

**Backend settings and requirements layout.** Django settings live in `backend/config/settings/`: `base.py` contains shared environment-neutral defaults, `local.py` imports the base settings and enables local development behavior, `production.py` imports the base settings and applies secure deployment configuration, and `test.py` imports the base settings and applies deterministic test configuration. Select the settings module explicitly with `DJANGO_SETTINGS_MODULE`; production and test commands must never fall back to local settings.

Python dependencies live in `backend/requirements/`. `runtime.txt` contains only dependencies required to run the deployed application. `development.txt` includes `runtime.txt` and adds local development tooling. `test.txt` includes `runtime.txt` and adds automated-test and contract-verification tooling. `requirements/README.md` documents the inclusion graph, installation commands, pinning/update policy and which file each environment installs. Do not add a second monolithic requirements file at the backend root.

**Frontend Bun rule.** Run frontend installs, scripts, code generation, tests and local tooling through Bun (`bun install`, `bun run <script>`, `bunx <tool>`). Commit `bun.lock`, pin the Bun version in the repository/CI, and do not commit npm, Yarn or pnpm lockfiles. Package scripts must remain portable enough for Cloudflare/OpenNext build tooling, but Node/npm are not the project's local package-management workflow. Production execution remains Cloudflare Workers; “Bun runtime” here governs local development, scripts, tests and CI steps that execute the frontend toolchain.

The backend agent owns the OpenAPI spec. The frontend agent never edits it or hand-writes API data types.

1. Backend writes Ninja routers and Pydantic schemas with stub handlers returning realistic examples. No business logic first.
2. Export `/contract/openapi.json` with the current Django Ninja schema-export command (confirm flags in installed version).
3. Both agents review contract and journey coverage. Freeze after approval.
4. Frontend generates types and client with `openapi-typescript` and `openapi-fetch`, and runs Prism from the same spec.
5. Backend replaces stubs with real handlers. Frontend builds against the mock, then switches the base URL to the real API.
6. CI regenerates spec and types and fails if committed output is stale. Schemathesis runs against the live API; Playwright runs end-to-end tests with the fake provider.

**Change rules:** additive changes (new endpoint, optional field) need a CHANGELOG line. Breaking changes (rename, removal, type change, new required field) need a CHANGELOG entry and sign-off from both agents.

---

# Guide: Core API conventions

- All endpoints under `/api/v1`, JSON, stable operation IDs.
- Money is integer XAF; currency is implied, not sent. The backend computes every price, fee, deposit, penalty and total.
- IDs are UUID strings. Public booking references and document tokens are random and unguessable.
- Timestamps are ISO 8601 UTC. Inputs must include an offset or be explicitly defined as local Africa/Douala time; reject ambiguous values.
- Pagination: `page`, `page_size` (capped) in; `{count, page, page_size, results}` out.
- Errors: `{"error":{"code":"vehicle_unavailable","message":"...","fields":{"start_at":["..."]}}}`. `message` is English for developers and never shown to customers; the frontend localizes by `code` and field name. 409 business conflicts, 422 validation, 401/403 auth, 429 with `Retry-After`.
- Idempotency: booking creation, retry-payment, pay-balance, extension, cancellation/refund requests, refund claim and security-deposit release require `Idempotency-Key` (UUID per attempt), scoped per endpoint; the backend stores and replays results.
- No request accepts a price, total, discount, penalty, deposit or refund amount.
- `Cache-Control`/ETag with conditional GET (304) for public fleet data; `no-store` for booking, driver, payment, inspection, document and refund responses.
- Public content endpoints take `lang=en|fr`; caches are keyed by `lang`.
- Every write endpoint declares auth, CSRF, rate limit, idempotency, audit and caching behavior in the contract.

## Core enums

| Enum | Values |
|---|---|
| locale | `en`, `fr` |
| operator | `mtn`, `orange` (nullable on Payment; filled only if the provider returns it) |
| vehicle_status | `draft`, `active`, `inactive`, `maintenance`, `retired`, `sold` |
| booking_status | `quote`, `pending_payment`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`, `needs_review` |
| payment_status | `initiated`, `pending`, `successful`, `failed`, `expired`, `reversed` |
| payment_kind | `booking_deposit`, `rental_balance`, `sale_reservation_deposit`, `security_deposit`, `extension`, `penalty`, `refund` |
| hold_status | `active`, `converted`, `expired`, `released` |
| hold_kind | `booking`, `extension` |
| inspection_type | `pickup`, `return`, `incident` |
| inspection_status | `draft`, `submitted`, `customer_acknowledged`, `disputed`, `finalized` |
| maintenance_status | `scheduled`, `in_progress`, `completed`, `cancelled` |
| refund_status | `pending_review`, `pending_claim`, `processing`, `paid`, `failed`, `expired`, `rejected` |
| refund_request_status | `submitted`, `approved`, `rejected` |
| deposit_ledger_status | `not_required`, `pending`, `held`, `released`, `partially_deducted`, `forfeited`, `failed` |
| media_status | `uploaded`, `queued`, `processing`, `ready`, `failed`, `quarantined` |
| transmission | `automatic`, `manual`, `other` |
| fuel_type | `petrol`, `diesel`, `hybrid`, `electric`, `other` |
| sale_status | `draft`, `available`, `reserved`, `sold`, `withdrawn` |
| sale_reservation_status | `pending_payment`, `reserved`, `completed`, `expired`, `cancelled`, `needs_review` |
| sale_inquiry_status | `new`, `contacted`, `test_drive_scheduled`, `closed` |
| test_drive_status | `requested`, `confirmed`, `completed`, `cancelled`, `no_show` |
| vehicle_condition | `new`, `used` |
| body_type | `sedan`, `suv`, `pickup`, `hatchback`, `van`, `coupe`, `other` |

Enums stay English machine codes; the frontend maps them to labels. State transitions are finalized in Phase 0 and written as one transition map used by API and admin.

---

# Guide: Domain model and database

Use relational tables, foreign keys, check/unique constraints and indexes. Media bytes live in R2; Postgres stores keys, metadata and derivative relationships.

Core models:
- `Vehicle`: one physical vehicle record shared by rental and sales (a vehicle is never offered for rental and sale at the same time). Public slug, fleet number, restricted registration identifier, make/model, year, category, seats, luggage capacity, transmission, fuel type, A/C, features, active state, branch, timestamps, `legal_hold`-style retention flags where needed.
- `VehicleTranslation` (or explicit `_en`/`_fr` columns; check Unfold compatibility): title, description, features, SEO text.
- `VehicleMedia`: vehicle FK, R2 object key, kind, role (`hero`, `gallery`, `walkaround`, `interior`, `exterior`, `engine_bay`; the same media serves rental and sales), alt text per locale, MIME, byte size, width/height/duration, checksum, visibility, sort order, status, derivative manifest.
- `Branch`: localized name/address, coordinates if approved, opening hours, contact, buffer override, active state.
- `RatePlan`: vehicle/class/season/date window, daily (or hourly) rate, minimum duration, included mileage, excess-mileage rate, active interval, version. Define overlap/priority rules before enabling seasonal rates.
- `FeeRule`: delivery, cleaning, late-return or other approved fee; versioned and auditable.
- `AvailabilityBlock`: vehicle, start/end, type (`booking_hold`, `confirmed_booking`, `maintenance`, `admin_block`, `transfer_buffer`, `test_drive`, `sale_reservation`), status, source record, expiry.
- `Booking`: public reference, nullable user FK, pickup/return branch, requested and normalized UTC times, status, quote snapshot, rate-version snapshot, locale, consent records, terms version.
- `BookingSnapshot`: immutable vehicle, rate, dates, daily rates, included mileage, fees, taxes if legally required, deposit, balance, total.
- `BookingHold`: vehicle, start/end, `expires_at`, status, kind, booking FK.
- `Payment`: booking **or** sale-reservation FK (exactly one), kind, amount, currency, provider, unique provider reference, merchant reference, optional operator, payer phone (full value stored restricted; masked in API; never logged), status, redacted request/response metadata.
- `PaymentEvent`: provider event id, signature outcome (if the provider documents signing), minimized/redacted payload, processed timestamp, dedupe key.
- `SecurityDepositLedger`: booking, amount, status (deposit_ledger_status), related payment/refund, reason codes, actor, timestamps. Never counted as revenue.
- `Refund`: booking or sale reservation, the payment it reverses, amount from DB, status, hashed single-use claim token, expiry, provider refund reference. `RefundRequest`: booking reference, contact, message, status.
- `ConsentRecord`: subject (user/booking), type (`terms`, `privacy`, `account`, `rental_terms`), text version, locale, timestamp.
- `DriverProfile` or booking-scoped driver snapshot: name, DOB only if required, license country/type/expiry, verification state. Files stay private in R2.
- `Inspection`, `InspectionMedia`, `MaintenanceBlock`, `Job`, `EmailOutbox`, `AuditLog`, `IdempotencyRecord`, `User`, `BranchStaffRole`, `DocumentAccessLog`.
- Sales models: `SaleListing` (vehicle FK, slug, `sale_status`, condition, `price_xaf`, mileage_km, year, body type, colour, VIN stored restricted with public display an owner decision, previous owners if known, registration status, localized service-history and known-defect disclosures, branch, published_at, last_reviewed_at, sold_at); `SaleInquiry` (contact, message, consent, locale, status, assigned staff); `TestDriveBooking` (listing, contact, slot, status; its slot is an `AvailabilityBlock` of type `test_drive`); `SaleReservation` (public reference, listing FK, buyer snapshot, price snapshot, deposit amount, status, `expires_at`/`reserved_until`, locale, terms version); `VehicleDocument` (private: registration, inspection report, service history, proof of ownership; visibility, checksum, retention); `OwnershipTransfer` (reservation FK, admin-only checklist, actors, timestamps).

Constraints and indexes:
- `end_at > start_at`; amounts >= 0; odometer >= 0; valid fuel/mileage values; valid status transitions in the service layer and by DB constraint where practical.
- Indexes: active vehicles by (status, category, branch) as partial index on active rows; slug; media by (vehicle, role, sort); bookings by public reference, user, (status, start/end); payments by (provider, provider_reference) and booking; availability blocks by (vehicle, time range) as GiST; holds by (vehicle, expires_at) partial on active; jobs by (status, run_at) partial on due rows; refunds on hashed token; idempotency by (endpoint, key) with `expires_at`; per-language GIN full-text indexes if search is offered.
- Range-overlap protection with PostgreSQL range/exclusion constraints (btree_gist) where supported, or a vehicle row lock plus re-check in the same transaction. Frontend checks are never sufficient.
- Create indexes concurrently on populated tables; run migrations on the direct Neon URL.
- Never hard-delete vehicles, bookings or financial/inspection/audit records; archive or deactivate.
- Never store identity documents as public URLs; store private keys and issue short-lived signed access after authorization.
- Snapshot price and terms at confirmation so later rate changes do not rewrite an agreement.
- Sales: a **partial unique index** allows at most one active `SaleReservation` (`pending_payment` or `reserved`) per listing, and reservation creation locks the listing row and rechecks `available`. Sale reservations do not use interval `BookingHold`; the reservation row with `expires_at` is the hold. A listing in `reserved`/`sold` never appears in rental search, and a fleet vehicle moves to sale only through a guarded admin action that checks future bookings.

---

# Guide: Rental availability, quotes and booking holds

1. Customer chooses pickup/return date-time, branch and vehicle.
2. Backend validates duration, operating hours, branch compatibility, vehicle status, buffers, maintenance blocks, existing bookings and active holds.
3. Quote service returns `quote_id`, `expires_at`, itemized amounts, deposit/balance split, approved security deposit and policy references. A quote is not an inventory hold unless the owner chooses so.
4. Booking creation (idempotent): lock vehicle/availability records, re-check the interval, create hold + pending booking + payment attempt in one short sync transaction (via `sync_to_async`), **commit, then** call Notch Pay. Never hold a DB transaction open during an external call.
5. Successful payment converts the hold to a confirmed booking only if payment and availability rules still pass. Duplicate callbacks are harmless.
6. Expired/failed holds release automatically. If payment succeeds after the hold expired and the interval is gone, mark `needs_review`, alert admin, and route the refund through the refund flow. Never silently double-book.
7. Confirmed bookings block interval plus preparation/return buffer. Maintenance and admin blocks conflict with bookings.
8. Extensions are a new quote + availability check (hold kind `extension`). Conflicts with the next booking require an explicit audited operations override.
9. Concurrent-request tests on PostgreSQL (not SQLite) for two customers booking the same vehicle/interval.

---

# Guide: Vehicle sales

Sales is a second module that reuses the platform's fleet records, media pipeline, accounts, payments, refunds, jobs, localization and admin. Everything in this section is a **proposed default pending owner approval** unless stated.

## Scope (v1)

In: public sales catalog, inquiries, test-drive booking, a **reservation deposit** paid by mobile money that holds a single-unit listing for a limited period, and offline completion at the branch (balance, paperwork, ownership transfer, handover).

Out until approved: full online payment of the purchase price, financing or credit, trade-ins, insurance or warranty products, bidding/offers, delivery, import/export logistics. Mobile-money per-transaction limits likely prevent paying a car price online; record the real limits in the Notch Pay spike.

## Vehicle lifecycle

- One physical `Vehicle` record; rental and sale use are separate states. A vehicle with an `available` or `reserved` listing is not offered for rental.
- Moving a fleet vehicle to sale is a guarded admin action: it blocks if there are future confirmed bookings unless the privileged rescheduling flow records and notifies affected customers.
- On completion the vehicle becomes `sold` (terminal, kept for records) and the listing `sold`.

## Listings and disclosure

- Price is integer XAF set by staff and snapshotted at reservation. A later price change never alters an existing reservation. No negotiation engine in v1.
- Listings state what the price includes and excludes (registration, transfer fees, taxes); wording is counsel's job.
- Required fields: condition, year, mileage, fuel, transmission, body type, branch, localized description. Service history, known defects/damage and registration status are shown only from verified staff input, with `last_reviewed_at`. No fabricated history, ratings, "inspected" or "certified" claims.
- VIN is stored restricted; whether to show it publicly is an owner decision. Ownership/registration documents stay private.

## Inquiries and test drives

- Inquiry: captcha, consent, locale, rate limited. Staff pipeline `new → contacted → test_drive_scheduled → closed`. A job alerts staff on inquiries unanswered after a setting (proposed 24 h). Retention is a setting.
- Test drive: slot request at a branch using the same overlap engine (`AvailabilityBlock` type `test_drive`, proposed 60 minutes plus buffer). Proposed: staff confirm each request. Licence check at the branch before keys are handed over. Reminders and no-show handling. Test-drive insurance and liability is an OWNER DECISION.

## Reservation deposit flow

1. Buyer picks a listing and submits contact and name details plus consents.
2. `POST /sales/reservations` (idempotent): in one short sync transaction lock the listing row, confirm `available`, create the `SaleReservation` (`pending_payment`, 15-minute `expires_at`) and the payment attempt (`sale_reservation_deposit`); commit; **then** call Notch Pay.
3. Deposit success, confirmed through the webhook and authoritative-status rules (see Webhook and finalization rules), sets the reservation `reserved` and the listing `reserved` until `reserved_until` (proposed 7 days, setting).
4. Completion at the branch: staff verify buyer identity per policy, record balance receipt (offline by default), complete the `OwnershipTransfer` checklist and handover. Listing and vehicle become `sold`; the deposit is recorded as applied to the price.
5. Expiry or cancellation: a job releases the listing. Proposed outcome: staff-reviewed refund through the refund claim flow. **Any forfeiture of the deposit needs owner and counsel approval** (consumer-protection lawfulness) and stays disabled until then.
6. A payment that succeeds after the checkout hold expired and the listing is no longer available sets the reservation `needs_review`, alerts admin and routes to the refund flow. Never double-reserve.

Proposed deposit: 10% of price rounded up to whole XAF, with min/max settings, subject to provider limits.

## Ownership transfer (admin only)

A checklist, not an automated verification: proof the business may sell the vehicle, buyer ID verified, sale agreement signed (localized template from counsel), registration/transfer paperwork status, handover timestamp, keys and documents handed over. Buyer ID copies and vehicle documents use the same private-bucket, signed-URL, access-log and retention rules as driver documents.

## Storefront

Top-level Rent and Buy sections with shared brand, components and media. Separate filters and clear price labelling so a per-day rental price is never confused with a sale price, and results are never mixed. Listing cards show the total price. Buy filters (in URL): make, model, year range, price range, mileage, fuel, transmission, body type, condition, branch, sort.

## Sales state machines (finalize in Phase 0)

- Listing: `draft → available ↔ reserved → sold`; `available/reserved → withdrawn`; `sold` is terminal.
- Reservation: `pending_payment → reserved → completed`; `pending_payment → expired/cancelled`; `reserved → expired/cancelled`; any paid state with no inventory → `needs_review`.

## Sales error codes

`listing_unavailable`, `listing_reserved`, `reservation_expired`, `test_drive_slot_unavailable`, `sale_deposit_not_allowed`.

## Sales owner decisions

Whether only ex-fleet vehicles are sold or also third-party/consigned stock; deposit percent and reservation period; forfeiture policy; VIN public display; test-drive insurance; accepted balance methods (cash, bank transfer, mobile money) and any cash-transaction limits (counsel); paperwork responsibilities and who pays registration/transfer fees; warranty and after-sale obligations; price/tax display; seller authorization checks; trade-in and financing roadmap.

---

# Guide: Pricing, payment, deposits and refunds

- One pure pricing function: inputs are vehicle/rate version, pickup/return instants, billing-unit policy, approved fee rules, approved deposit policy; output is a fully itemized integer-XAF quote. Document rounding and time-boundary behavior.
- Persist quote snapshot and expiry. Recalculate at booking creation; reject expired or changed quotes with `quote_expired` / `quote_changed` and a fresh quote.
- Booking deposit, rental balance, security deposit, extension and penalty are distinct ledger entries. Security deposit is not revenue.
- Each retry is a distinct payment attempt with its own idempotency key. Payment records are immutable except state updates.
- **Security deposit mechanism (OWNER DECISION).** Do not assume Notch Pay supports pre-authorization. Options: (a) collect-and-refund online using a payment-linked refund if Notch Pay confirms it works for the channels used (a general transfer/payout is not a substitute), (b) collect and refund offline at the branch, (c) no deposit. The API flow stays disabled until one is chosen and verified.
- Do not promise automatic refunds until Notch Pay Test Mode and written confirmation prove mobile money refund eligibility, partial-refund behavior, limits and fees for the channels used.

## Webhook and finalization rules

Webhooks are untrusted notifications. Acknowledge with HTTP 200 after durable enqueue; the handler then reads authoritative status from the provider and compares merchant/provider reference, amount, currency, expected payment kind and successful status. Only then, in one atomic transaction, update payment and booking (deposit → `confirmed`; balance → paid; extension → apply). Dedupe by provider and event ID or payment reference. Handle duplicate, delayed, out-of-order and forged callbacks. Webhook endpoint: CSRF-exempt, strict body size limit, redacted stored event, signature verified only where the provider documents a scheme. If a payment is still pending past a threshold with no webhook, the status endpoint asks the provider directly and finalizes the same way. Slow work (emails) goes to jobs.

| Provider status | payment_status | Booking effect |
|---|---|---|
| pending / processing | pending | stays `pending_payment` |
| successful | successful | deposit: `confirmed`; balance: balance paid; extension: applied; sale reservation deposit: reservation and listing `reserved` |
| failed / canceled | failed | stays `pending_payment`, retry allowed until hold expiry |
| no answer in window | expired | hold released; booking `cancelled` by job |

## Payment provider interface and spike plan

Notch Pay is the chosen provider, isolated behind one interface so Notch Pay or pawaPay can be added as a fallback without touching other code.

- `collect(booking_ref, amount_xaf, phone, description)` → provider reference, status, optional operator, optional USSD code.
- `get_status(provider_ref)` → pending | successful | failed, with operator, amount, failure reason.
- `refund(provider_payment_ref, refund_ref, amount_xaf)` and `get_refund_status(provider_ref)` (Notch Pay `POST /refunds` against the original payment reference; omitting `amount` requests a full refund). A generic transfer/withdrawal must not silently substitute for a refund unless the owner approves it and it is linked to the original payment and payer number.
- `parse_webhook(request)` → bounded notification; reference is a lookup hint only.
- Statuses are normalized inside each adapter. `PAYMENT_PROVIDER` selects `notchpay`, `campay`, `pawapay` or `fake`; credentials are per provider in environment variables.
- Phone numbers accepted with or without `+237`, normalized before storing/sending. Map provider phone/limit failures to `unsupported_phone` and `payment_limit_exceeded` once exact provider codes are confirmed.
- Shared `httpx.AsyncClient` per process with explicit timeouts and connection limits; retries only on safe/idempotent calls.
- One test suite runs against every adapter. The fake provider supports pending, success, failure, delayed webhook, duplicate webhook, amount mismatch, forged webhook and provider outage.

**Notch Pay facts (from its public API reference and guides; these are the plan until the spike proves them):**
- API host `https://api.notchpay.co`; separate test and live credentials. The public key goes in the `Authorization` header (no Bearer prefix shown); the refund guide also shows the private key in `X-Auth` for `POST /refunds`. Confirm header names in Test Mode.
- Direct charge starts with `POST /payments` (amount, currency XAF, customer, description, unique merchant reference). The follow-up charge call uses the returned payment reference, channel and payer phone; the guide and API reference disagree on its HTTP method and body, so confirm in Test Mode. `GET /payments/{reference}` returns the authoritative status (distinguish API response status from payment status).
- Cameroon channels: `cm.mobile` (MTN or Orange routed automatically), `cm.mtn`, `cm.orange`. Use `cm.mobile` so checkout needs no operator input; `Payment.operator` is nullable and filled only if returned. Processing takes about 5 to 30 seconds. Phone format `+237XXXXXXXXX`.
- A duplicate merchant reference returns HTTP 409; confirm recovery after an ambiguous timeout so a retry cannot trigger two prompts.
- Webhooks are POSTs with `id`, `event`, `data`. Acknowledge with HTTP 200; failed deliveries retry every 45 minutes for 36 hours. The public guide defines no signature scheme: obtain it from Notch Pay before claiming signature verification, and always use `GET /payments/{reference}` as the authority.
- Refunds: `POST /refunds` with the original payment reference; poll refund status or handle `payment.refunded` (verify through the API). Provider pending/processing map to refund `processing`, `complete` to `paid`, failed to `failed` plus admin alert.
- Test Mode publishes success and failure numbers for Cameroon MTN and Orange Money; use them in the spike.
- Polling UX: tell the customer to check their phone after ~120 s and offer a retry after ~5 minutes.
- Error mapping: INVALID_PHONE and UNREGISTERED_PHONE → 422 `unsupported_phone`; TRANSACTION_LIMIT_EXCEEDED → `payment_limit_exceeded`; other provider failures → `payment_failed` with a stable reason code (confirm exact codes in Test Mode).

**Notch Pay verification spike (parallel with Phases 1-2, complete before Phase 3):**
1. Use Notch Pay Test Mode with separate test keys and a webhook endpoint.
2. Cover MTN and Orange success and failure, pending→successful, status polling, webhook retries and duplicate delivery, full and partial payment-linked refunds, and a duplicate merchant reference.
3. Record the actual charge method/body, `cm.mobile` routing result, payment and refund lookup fields, webhook payloads, any signing scheme, ambiguous-retry recovery, limits and refund eligibility.
4. Ask Notch Pay in writing for live onboarding documents/timeline, collection and transfer fees, settlement schedule, whether transfer fees are charged to us, licensing status, who holds merchant funds, support channels and response times.
5. Start live onboarding immediately (lead time) while building against Test Mode.
6. Record findings in this guide and `NOTES.md` before Phase 3, correcting anything the docs got wrong. If Notch Pay cannot meet the webhook-authenticity or refund requirements, add Notch Pay through the same interface (its signing, retry, idempotency and refund behavior also need written confirmation).

## Refund claim flow

Refunds are initiated against the original payment. The customer gets an email with a claim link, sees the **masked** original payer number, and confirms; the destination cannot be changed.

1. Create a `Refund` (booking, payment reversed, amount from DB, `pending_claim`, hashed single-use token, expiry 3 days).
2. Resend email carries the claim link.
3. Claim page shows amount and masked number. No phone field exists in the claim request.
4. `POST /refunds/{token}/claim` with Idempotency-Key calls the provider with the stored amount; status becomes `processing`.
5. A job and status endpoint reconcile to `paid` or `failed`. A failed refund can be re-claimed only after reconciling the prior provider request (no duplicates).
6. Expired link: customer submits `POST /refunds/requests`; admin reviews; approval issues a new claim link (any fee deduction is an owner decision).

Refunds are created for approved cancellations, `needs_review` late payments with no inventory, admin-approved refunds, and approved security-deposit releases. Failed or stuck refunds alert admin. Admins can reissue links or mark paid manually (audited).

## Endpoints (first-draft)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/config/rental` | public | Duration limits, hold/quote minutes, deposit/buffer settings, terms version, policy references safe to expose |
| GET | `/locations/branches` | public | Active branches, hours, pickup info |
| GET | `/fleet/categories` | public | Categories |
| GET | `/fleet/vehicles` | public | Filter by branch, category, seats, transmission, fuel, features, price range, date interval; sort; paginated |
| GET | `/fleet/vehicles/{slug}` | public | Detail and approved public media manifest |
| GET | `/fleet/sitemap` | public | Slug + updated_at feed |
| POST | `/availability/search` | public | Available vehicles for interval and filters |
| POST | `/quotes` | public | Create/recalculate quote with expiry |
| GET | `/quotes/{quote_id}` | public token or session | Retrieve own quote |
| POST | `/bookings` | public, CSRF, captcha | Create booking/hold, start payment; idempotent |
| POST | `/bookings/lookup` | public, CSRF, captcha | Guest lookup by reference + verified email/phone; generic error on mismatch |
| GET | `/bookings/{reference}` | reference + verification | Safe summary |
| GET | `/bookings/{reference}/status` | reference + verification | Polling status |
| POST | `/bookings/{reference}/retry-payment` | public, CSRF, captcha | New payment attempt; idempotent |
| POST | `/bookings/{reference}/pay-balance` | public, CSRF, captcha | Pay balance; idempotent |
| POST | `/bookings/{reference}/cancel` | verified guest/customer, CSRF | Cancellation request per approved policy |
| POST | `/bookings/{reference}/extension-quote` | verified customer/staff | Quote extension |
| POST | `/bookings/{reference}/extend` | verified customer/staff, CSRF | Confirm extension; idempotent |
| POST | `/bookings/{reference}/driver` | verified, CSRF | Submit driver details (approved fields only) |
| POST | `/documents/upload-intent` | verified, CSRF | Private document upload intent |
| GET | `/sales/listings` | public | Filter by make, model, year range, price range, mileage, fuel, transmission, body type, condition, branch; sort; paginated |
| GET | `/sales/listings/{slug}` | public | Listing detail, disclosures, approved public media |
| GET | `/sales/sitemap` | public | Slug + updated_at feed |
| POST | `/sales/inquiries` | public, CSRF, captcha | Submit inquiry |
| GET | `/sales/test-drives/slots` | public | Available test-drive slots for a listing and date |
| POST | `/sales/test-drives` | public, CSRF, captcha | Request test drive; idempotent |
| POST | `/sales/reservations` | public, CSRF, captcha | Create reservation and deposit payment; idempotent |
| GET | `/sales/reservations/{reference}` | reference + verification | Safe summary |
| GET | `/sales/reservations/{reference}/status` | reference + verification | Polling status |
| POST | `/sales/reservations/{reference}/retry-payment` | public, CSRF, captcha | New attempt; idempotent |
| POST | `/sales/reservations/{reference}/cancel` | verified, CSRF | Cancellation request per approved policy; idempotent |
| GET | `/me/sales/reservations` | verified session | Buyer reservation history |
| POST | `/payments/{provider}/webhook` | provider verification | Excluded from frontend client |
| GET | `/refunds/{token}` | claim token | Amount, booking reference, status, masked number |
| POST | `/refunds/{token}/claim` | claim token, CSRF | Idempotent; no body |
| POST | `/refunds/requests` | public, CSRF, captcha | Manual refund/cancellation review request |
| GET | `/auth/csrf` | public | CSRF cookie |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | public, CSRF | Session auth (register: neutral 202) |
| GET / PATCH | `/auth/me` | session | Current user / rectification |
| POST | `/auth/password-reset/request`, `/auth/password-reset/confirm` | public, CSRF | Password reset |
| POST | `/auth/verify-email/request`, `/auth/verify-email/confirm` | session / public, CSRF | Email verification (confirm signs in) |
| GET | `/me/bookings`, `/me/bookings/{reference}` | verified session | History and detail |
| POST | `/me/deactivate` | session, CSRF | Password required |
| GET | `/me/export` | verified session | JSON export |
| POST | `/inspections/{id}/acknowledge` | verified customer/staff | Customer acknowledgement |
| GET | `/media/{id}/signed-url` | authorized | Short-lived private evidence/document access |
| GET | `/healthz` | public | Database-free |
| POST | `/internal/jobs/run` | shared secret | Cron-only runner; excluded from client |
| POST | `/internal/media/process` | signed internal secret | Media worker entrypoint; never public |

Staff-only upload-intent, media completion/retry/approve, inspection, maintenance and override operations are listed in Phase 0 (staff UI is Django admin; any endpoint used by a browser upload widget or media worker still needs a contract entry).

---

# Guide: Authentication, cookies and accounts

- Django issues `httpOnly`, `Secure`, `SameSite=Lax` session cookies. Fetch uses `credentials: "include"`.
- **Domains:** serve the Worker and API from the same registrable domain and scope the cookie to the parent domain; different registrable domains make the cookie third-party and it will be blocked. Settle domains before deployment work. Cookie domain, CORS origin, CSRF trusted origins and R2 CORS all come from environment variables.
- CORS allow-lists only the storefront origin with credentials; no wildcard.
- CSRF: call `GET /auth/csrf` once, then send the token on every unsafe method, guests included, except compute-only POSTs (`/availability/search`, `/quotes` if designated). Confirm Ninja's CSRF handling against installed versions and test early.
- Server Components forward the incoming Cookie header only for private pages. Public fleet fetches carry no cookies so Next can cache/revalidate.
- Optional account at booking: the booking payload carries `create_account` and password. The account is created without a session, linked to the booking, and a verification email is sent; the user signs in when opening the verification link. Store consent timestamps.
- **Neutral registration:** register and booking-time account creation always answer identically for new and existing emails (same body, status, timing; no session). New email → verification email. Existing unverified → fresh verification email and password replaced by the one just submitted (blocks pre-registration hijacking). Existing verified → "an account exists" email with login/reset links; account never changed; booking stays a guest booking.
- Linking guest bookings: only when the account is created in the same booking; usable after verification. Linking older bookings by verified email is post-v1.
- Guest lookup requires reference plus a second factor (verified email/phone or single-use link) and returns the same generic error on mismatch.
- Passwords: Django validators and a strong hasher. Login throttled, generic error for wrong password/unknown email/inactive account. Rotate session on login, invalidate on logout, expire after inactivity (setting).
- Email verification required: opening the link signs in; unverified accounts can log in but `/me/bookings` and `/me/export` return 403 `email_not_verified`. Reset/verification tokens are single-use, hashed, expiring.
- Staff: separate Django admin login on the API host under `/admin/`, mandatory TOTP 2FA. Roles: owner, fleet manager, branch operator, mechanic, support, finance, sales agent. A mechanic must not automatically see payer phones or identity documents.

---

# Guide: Localization (English and French)

- Locales `fr` (default) and `en`; URLs `/fr/...` and `/en/...`, hreflang, canonical per locale, locale-specific sitemap. Vehicle slugs shared across languages in v1.
- UI strings: one message catalog per locale via an App Router i18n library (for example next-intl); verify compatibility with the OpenNext Cloudflare adapter.
- API: `lang` query parameter on content endpoints; missing translation falls back to the other language; caches keyed by `lang`; Accept-Language not used for content.
- Stored content: vehicle title/description/features/SEO text, branch details, fee labels, policy content and media alt text exist in both languages; admin edits both.
- Errors localized by `code` and field name on the frontend. Money formatted per locale from integer XAF.
- Locale stored on booking and user; confirmation, reminder, cancellation, payment and refund emails use it.
- Time: store UTC, display Africa/Douala (fixed UTC+1). Make the timezone explicit in pickers and confirmations.
- Static pages (terms, rental conditions, privacy, cancellation/refund, about, contact, legal notices): localized content files, one per locale.
- Postgres full-text search uses the French or English configuration per `lang` if search is offered.
- Admin interface follows staff language; check Unfold translation coverage.
- SEO: category, vehicle, sales listing and branch pages; canonical, Open Graph, sitemap, robots; Vehicle/Offer structured data only where accurate (sales listings may use Car/Vehicle with Offer, price in XAF, only while genuinely in stock; rental pages avoid Offer unless accurate); no fabricated ratings or availability.
- Accessibility: keyboard-operable date controls, visible focus, labeled forms, error summaries, alt text, captions/transcripts for speech, reduced motion, contrast.

---

# Guide: Security

Items marked **Contract** change the API and must be in Phase 0.

- Turnstile on booking creation, guest lookup, registration, password-reset request, refund request; frontend sends `captcha_token`, backend verifies, failure returns `captcha_failed`. **Contract.**
- Every public endpoint is rate limited, stricter for auth, booking, lookup, availability search and refunds; 429 + `Retry-After` + `rate_limited`. Backend proposes numbers in `NOTES.md`. Cloudflare rules are a first layer.
- Refunds go only to the original payer's number; claim requests have no phone field; masked in the UI; each refund linked to the payment it reverses. **Contract.**
- Full payer phone is stored for reconciliation/support, masked in API responses, never logged, visible in admin only to roles that need it.
- Account deactivation (`POST /me/deactivate` with password): sets inactive, ends sessions, blocks login, keeps identity, bookings and payments so transactions stay traceable; admin can reactivate. Export via `GET /me/export` (verified email, rate limited). **Contract.**
- Personal data (names, emails, phones, licence/registration data, addresses) redacted from logs and error reports; error tracking must not capture identity images or signed URLs.
- DEBUG off, explicit ALLOWED_HOSTS, secure cookies, CORS/CSRF origins from environment, secrets only in env/secret stores, different per environment, never committed.
- Security headers on API and storefront: HSTS, CSP, X-Content-Type-Options, frame protection, Referrer-Policy, restrictive Permissions-Policy; test compatibility with media delivery.
- Admin uploads validated for type and size; executables rejected. Locked dependencies and vulnerability scans in CI.
- Audit trail for booking overrides, price changes, payment/refund actions, document access, media approval/deletion, inspection changes, maintenance blocks.
- Structured logs with request/correlation IDs. Alerts: payment/webhook failures, duplicate/late payments, booking conflicts, overdue vehicles, failed refunds, media backlog/failure, R2 missing objects, job-runner failure, DB saturation, repeated auth failures.
- Neon backup/restore tested before launch; R2 versioning/lifecycle strategy; a documented **joint recovery procedure** (a DB backup alone does not restore media).
- Staging smoke tests before release.

New error codes: `captcha_failed`, `email_not_verified`, `rate_limited`, `terms_outdated`, `unsupported_phone`, `payment_limit_exceeded`, `refund_link_expired`, `refund_already_claimed`.

---

# Guide: Compliance (Cameroon)

Sources: Law No. 2024/017 (personal data protection), Law No. 2010/021 (electronic commerce), Law No. 2011/012 (consumer protection). This section turns them into build rules. **It is not legal advice**; sources disagree on some details, so a Cameroonian lawyer must confirm everything before launch. The owner has accepted these rules as the v1 build baseline (13 Oct 2026); counsel review remains a launch gate.

Personal data (Law 2024/017):
- Scope: applies to processing data of people in Cameroon. Hosting on Neon, Render, Cloudflare and Resend does not remove the store from scope.
- Consent must be explicit, informed, free. Separate unticked checkboxes for terms/privacy (`accept_terms`), account/future offers (`account_consent`), and rental conditions (`rental_terms_accepted`). Marketing is never bundled into terms. Store a consent record (text version, locale, timestamp) on booking and user. The frontend sends the `terms_version` it displayed; a stale one returns 409 `terms_outdated`.
- Minimization: collect only what the rental needs. Driver DOB and licence data only if the owner approves them as required. Delivery notes optional. Payer phone retained only as needed for refunds/reconciliation.
- **Driver documents are the highest-risk data.** Private bucket, signed short-lived access, access logging, role restriction, owner-approved retention with automated deletion/anonymization after the period unless a legal hold applies.
- Rights: access via `GET /me/export`, rectification via `PATCH /auth/me`, erasure requests reviewed case by case. Deactivation keeps identity for traceability of disputed transactions (counsel confirms basis and period; privacy policy states what is kept, why, how long). Deactivated users are hidden from normal admin views, visible only to the owner role, every access audited. A `legal_hold` flag stops purges on a user/booking under investigation; at retention end the purge job anonymizes unless held.
- Retention periods are settings enforced by purge jobs (guest and deactivated personal data, documents, inspection evidence, refund messages, logs, tokens). Official maximums may be published later by the Authority.
- Authority obligations: prior authorization or declaration, register of processing activities, impact assessment for high-risk processing, breach notification. Keep a **processing register** (data, purpose, storage, processor, retention) and a **breach response runbook** in the repo.
- International transfers need the Authority's authorization. Neon, Render, Cloudflare (including R2, Turnstile), Resend, Notch Pay are processors; list them and choose regions deliberately.
- Profiling: v1 has none. Minors: terms state the service is for adults meeting the driver requirements (counsel confirms).

E-commerce and consumer protection (Laws 2010/021, 2011/012):
- Before payment show the full offer: vehicle, dates, branch, price lines in XAF (rental, fees, booking deposit, balance, security deposit shown separately), cancellation terms and conditions of rental. The checkout summary lets the customer review before confirming.
- Acknowledge every booking; send the confirmation email immediately (the law requires acknowledgment within 5 days).
- Rental terms need explicit acceptance (deposit, cancellation schedule, late/mileage/fuel/damage rules, security deposit); the booking stores the terms version.
- Terms, privacy policy, cancellation/refund policy and legal notices exist in French and English; wording is counsel's job. Seller identity and contact details appear on the site.
- Tax and insurance wording: counsel confirms display and liability statements.
- Sales: listings disclose price in XAF, what it includes/excludes, condition, mileage and known defects; reservation terms (deposit, reservation period, refund/forfeiture) need their own explicit acceptance and stored terms version; seller authorization to sell, sale agreement wording, withdrawal/return rights, warranty obligations and cash-transaction limits are counsel items. Buyer ID and vehicle ownership documents follow the driver-document controls above.

Open items for the owner (not engineering): whether authorization or only declaration is needed and whether the Authority's decree exists; the transition deadline (one source gives 23 June 2026, already passed, so confirm current position now); authorization for foreign processors; retention periods and basis for keeping deactivated identities; lawfulness of any non-refundable deposit portion; licence/ID retention basis.

---

# Guide: Media storage, conversion and delivery (required)

This intentionally differs from the ecommerce guide, which discards originals: rental keeps private originals because inspection evidence and walkaround video have dispute value and variants may change later.

## Storage layout

Separate buckets or strict prefixes with different policies:
- `rental-originals-private`: original uploads and sensitive documents; never listed or served publicly.
- `rental-media-public`: approved vehicle derivatives only.
- `rental-evidence-private` (optional): pickup/return damage evidence.

```text
vehicles/{vehicle_uuid}/original/{upload_uuid}.{ext}
vehicles/{vehicle_uuid}/images/{media_uuid}/{content_hash}/w640.webp
vehicles/{vehicle_uuid}/images/{media_uuid}/{content_hash}/w1280.avif
vehicles/{vehicle_uuid}/video/{media_uuid}/{content_hash}/720p.webm
vehicles/{vehicle_uuid}/video/{media_uuid}/{content_hash}/1080p.mp4
vehicles/{vehicle_uuid}/video/{media_uuid}/{content_hash}/poster.webp
inspections/{booking_uuid}/{inspection_uuid}/{upload_uuid}.jpg
documents/{customer_uuid}/{document_uuid}/{upload_uuid}
vehicle-docs/{vehicle_uuid}/{document_uuid}/{upload_uuid}   # private sale documents
```
No names, phones, emails, licence numbers in keys; random IDs only. Store keys, not complete URLs, so the delivery domain can change. Content hash in public keys so a URL never changes meaning.

## Upload and processing pipeline

1. Authorized staff requests an upload intent: short-lived presigned PUT scoped to one random key, content type and size limit.
2. Browser uploads large media directly to R2 (not through Django/Render). Backend verifies the object after upload.
3. Create `VehicleMedia`/`InspectionMedia` in `uploaded` state; enqueue a media job. Extension or browser MIME alone is not proof of type.
4. Validate magic bytes, actual MIME, dimensions, duration, frame rate, size, checksum, codecs, decompression/pixel caps. Reject malformed files, SVG/HTML (unless sanitized and needed), archives, executables. Scan where feasible.
5. Worker downloads the private original, processes within limits, writes derivatives and a manifest. Idempotent: retries create no duplicates or orphans.
6. `ready` only when all required derivatives exist and pass checks. On failure: safe error code, backoff retry, staff-visible status, alert after repeated failures.
7. Public pages use only approved public derivatives. Evidence/documents stay private behind authorization and short-lived links.
8. On replace/delete, mark inactive first; clean up asynchronously after reference and retention checks. A scheduled job removes orphans and a reconciliation job finds DB rows with missing objects.

## Image optimization

- Process from the private original; never re-encode a derivative.
- Widths for real components (320, 640, 960, 1280, 1920), capped by source; no upscaling.
- WebP, plus AVIF where measured worthwhile, JPEG fallback if needed. Measure quality/size.
- Dedicated card thumbnail, gallery, hero and Open Graph crops with intentional focal points.
- Strip EXIF/GPS from public derivatives; auto-rotate first.
- Small blurred placeholder only if it improves perceived loading without bloating payloads.
- `next/image` with a Cloudflare/OpenNext-compatible custom loader over pre-generated derivatives (explicit width/format allow-list); do not assume the default optimizer runs on Workers. Verify on the real adapter.
- `sizes`, intrinsic dimensions, `srcset`; eager/high-priority only for the true LCP image; lazy-load below the fold.
- `Cache-Control: public, max-age=31536000, immutable` on versioned derivatives. Deliver via custom media domain on the Cloudflare CDN, not the bucket dev URL.
- Contract: media returns `renditions` (width, height, url, content_type, bytes) and optional `placeholder`; the frontend builds `srcset` from them.

## Video optimization

- Original stays private; derive asynchronously. Never transcode in a request handler, and do not assume Workers run FFmpeg.
- WebM and MP4 (H.264/AAC baseline), 360/480/720p, optional 1080p based on source and budget; no upscaling.
- WebP/JPEG poster and thumbnail. Poster carries the initial visual; no autoplay of large video on mobile.
- `preload="none"` or `metadata`, explicit aspect ratio, controls for user-started playback, captions where speech exists, reduced-motion alternative. Autoplay only muted and non-blocking.
- Progressive MP4/WebM unless usage justifies HLS/DASH. Verify byte-range, `Content-Type`, cache and CORS behavior on the CDN/R2 path.
- Enforce max duration, dimensions, size, codecs. Use an FFmpeg-capable worker or selected media service (an intentional exception to the no-worker default); measure CPU/memory/cost and keep it off the web service.
- Private inspection videos never get a public derivative; same authorization as the source.

## Media acceptance tests

Spoofed MIME, extension mismatch, oversize, decompression bombs, malformed files, unauthorized upload, expired presigned URL, key/prefix substitution, private URL leakage; correct content type, cache headers, CORS, byte ranges and immutable keys for derivatives; public endpoints never expose private keys/originals/signed URLs; budgets (bytes per page, requests, processing latency, queue backlog, failure rate, egress) set in `NOTES.md`.

---

# Guide: Optimization

Many customers use mid-range phones on slow mobile networks; every rule favors less data and fewer round trips.

## Mobile-first requirement (non-negotiable)

Mobile is designed, built, reviewed and accepted before wider layouts. Tablet/desktop add space and density but never become the canonical version.
- Layouts and source order start at 320 CSS px and enhance upward; no horizontal page scrolling at any supported width.
- Mobile DOM order prioritizes the primary task; desktop rearrangement must not create a different reading/keyboard order.
- Browse, search, quote, booking, payment, tracking, account and refund journeys work without hover, precise pointer or wide screens.
- Touch targets at least 44x44 CSS px; visible focus; readable default text; sticky mobile actions only where they do not obscure content, validation or the keyboard.
- Primary test widths 320, 360, 375, 390; verify 768, 1024, 1440 as enhancements.
- Test French and English at narrow widths: long vehicle names, large XAF totals, date/time ranges, validation messages and payment statuses must wrap without clipping.
- Mobile performance budgets are release gates, measured on mid-range Android and throttled networks.
- Visual source of truth is the Visual Design Specification; no separate desktop-first system.
- Vehicle categories are a primary discovery route: desktop uses an accessible category menu; mobile uses a tap-first drawer/accordion with the same information architecture.

## Database

- Indexes listed in Domain model; avoid N+1 with `select_related`/`prefetch_related`; `.only()` on list endpoints; query-count tests for list/detail endpoints in CI.
- Inspect `EXPLAIN ANALYZE` on representative data; aggregate in SQL.
- Short transactions; slow work (email, media, provider calls) outside them.
- Purge jobs delete expired idempotency keys, processed webhook events, finished jobs, expired tokens and expired quotes/holds.
- Watch slow queries (`pg_stat_statements` if available); size Neon compute and autosuspend deliberately.

## Backend

- Async ORM and `httpx.AsyncClient`; no blocking calls in the event loop. Sync-boundary functions for `atomic`/`select_for_update`; confirm Django's current async-transaction behavior.
- ETag/304 on public fleet endpoints; small in-process short-TTL caches for rental config and branches; no Redis.
- Compression at the Cloudflare edge or Django gzip; cap `page_size`; lean list schemas.
- Webhook path does verification and finalization only. Job runner works in bounded batches with a time budget.
- Admin: `list_select_related`, sensible `list_per_page`, thumbnails from the smallest rendition, static files via WhiteNoise compressed and cached.
- Size Granian workers to the Render instance; verify current flags. Request body limits and timeouts everywhere.

## Frontend

- Server Components with revalidation for public fleet pages; client components only where needed. Check OpenNext's incremental cache before relying on revalidation. Cache keys include `lang` and every search dimension.
- Availability and quote results uncached or very short-lived; revalidated at booking.
- URL query params for branch, category, dates, seats, transmission, fuel, sort.
- Do not serialize large media manifests into pages; only needed renditions.
- Worker bundle limit is hard (3 MiB Free / 10 MiB Paid per OpenNext's docs); set a bundle budget in CI; dynamic-import Turnstile and the date/time picker only where needed.
- Tailwind only, tokens in the theme config, no runtime CSS-in-JS; `next/font` with French-accent subsets and `display: swap`.
- TanStack Query stale time ~60 s for fleet data, zero for bookings/quotes; polling follows API `polling` hints, stops on terminal states, pauses in hidden tabs. Zustand holds only search drafts and UI state, hydrated after mount; no sensitive data in localStorage.
- Budgets: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 on a throttled mid-range mobile profile via Lighthouse CI.
- Prefetch links only when in the viewport.

---

# Guide: Hosting and background jobs

| Component | Choice |
|---|---|
| Frontend | Cloudflare Workers via `@opennextjs/cloudflare`; verify supported Next.js versions and bundle limits |
| API | Render web service running Granian |
| Database | Neon Postgres |
| Public media | R2 derivatives via custom domain/CDN |
| Private originals/documents/evidence | Private R2 with short-lived authorized access |
| Email | Resend via httpx |
| Scheduler | Cloudflare Cron Trigger calling the secured job endpoint |
| Media processing | Separate FFmpeg-capable worker/service chosen after cost/runtime validation |

Job runner:
1. `jobs` table (type, payload JSON, run_at, attempts, status, locked_at, last_error, idempotency key) is the outbox and queue.
2. A Worker with a Cron Trigger calls `POST /internal/jobs/run` with a shared secret (constant-time comparison, strict limits, audit log).
3. The endpoint claims due rows with `select_for_update(skip_locked=True)`, runs them in bounded batches with a time budget, retries with backoff; handlers are idempotent.
4. Time-critical emails (booking confirmation, payment received) are attempted right after the payment transaction commits; cron only retries failures.

Scheduled work: expire holds and quotes; re-check stale Notch Pay payments and reconcile webhook gaps; booking/pickup/return reminders and overdue alerts; cancellation/refund processing and claim-link emails; refund/deposit reconciliation; release security deposits only under approved policy after reconciliation; flag overdue bookings for staff (never auto-extend into a conflicting booking); media retries, orphan cleanup, object-existence checks; staff alerts (media failures, low availability, maintenance, bookings needing review); retention/deletion jobs only after policies are encoded; expire sale reservations and send reservation and test-drive reminders; flag unanswered inquiries; purge jobs.

Trade-offs: a frequent cron keeps Neon awake and defeats scale-to-zero, so start at one run every 10 minutes and tighten only on evidence. A second trigger pings `GET /healthz` more often than Render's idle timeout (check the plan's value); `/healthz` never touches the database. If volume grows, move the same runner into a Render background worker.

Domains: settled before deployment (see Authentication). Use environment variables for cookie domain, CORS, CSRF origins, R2 CORS, media domain. Workers never proxy API calls; the browser talks to Django directly.

---

# Guide: Frontend state

- TanStack Query owns server state (availability, quotes, booking status, profile, history). Zustand owns only small client state (search drafts, UI flags, non-authoritative preferences). Never copy server state into Zustand.
- Prices, availability and booking validity are never authoritative client state; the server revalidates at quote and booking time.
- The generated API client is wrapped once to include credentials, CSRF header, request ID, and map `error.code`/`error.fields` to form state.
- Route-level loading/error boundaries, accessible date/time controls, explicit timezone display, localized errors.
- Analytics only with consent and never with personal or driver data.
- Measure Core Web Vitals, bundle size, API latency and cache hit ratio; fail CI on material regressions.

---

# Guide: Admin and rental operations

Django admin + Unfold; staff-only; no public admin API.

Sections: Fleet (vehicles, localized descriptions, media and processing status, retirement); Locations; Pricing (rate plans, fees, effective dates, history); Bookings (date/branch/status/payment filters, customer-safe summary, immutable price snapshots, notes, guarded cancellation/extension actions); Operations (pickup queue, returns due, overdue, maintenance, cleaning); Inspections (checklists, evidence with restricted access); Payments/refunds (attempts, webhook events, reconciliation, security-deposit ledger, claim reissue, sensitive fields by role); Media (pending/failed, requeue, replace, approve, cleanup); Customers/drivers (least-privilege identity access, verification state); Audit (read-only); Consent history; Deactivated users (owner only).

Dashboard (Unfold callback; ORM aggregations and indexed queries): pickups today, returns due, overdue vehicles, active fleet, maintenance blocks, pending payments, refunds awaiting review, failed media jobs, bookings needing review.

Sales (Unfold section): listings, inquiry pipeline, test drives, reservations, ownership-transfer checklist, vehicle documents (restricted), sold archive; the guarded "move vehicle to sale" action. Dashboard adds open inquiries, test drives today, reservations expiring, sold this month.

Admin actions use the same domain services as the API. State transitions are centralized, audited and follow the transition map; manual overrides need a reason and actor. No hard deletes of financial, booking, inspection or audit records. Groups/permissions are created by a data migration.

---

# Guide: Pickup, return, damage and maintenance

Pickup:
1. Staff opens the confirmed booking; verifies customer/authorized driver per approved policy.
2. Confirm booking, payment and security-deposit state; do not expose full payer data.
3. Record odometer, fuel/battery, accessories, checklist.
4. Capture timestamped photos/video (all sides, interior, dashboard, existing damage, fuel/odometer) to private evidence storage.
5. Customer acknowledges digitally, or staff records why not; store actor, time and report version.
6. Move to `in_progress` only when required checks pass.

Return:
1. Record actual return time, odometer, fuel/battery, accessories, condition.
2. Capture comparable evidence.
3. Compute mileage/fuel/late fees only with approved rules, itemized, with staff review where required.
4. If damage is alleged: mark for review, preserve evidence, restrict access, never auto-charge an unapproved amount.
5. Apply the cleaning/inspection/maintenance buffer.
6. Complete the booking; run the approved security-deposit release/refund workflow after reconciliation.

Maintenance: a vehicle cannot be offered during maintenance/admin blocks or when unsafe/retired. Block overlap with confirmed bookings unless a privileged rescheduling workflow records affected bookings and notifies customers. Service intervals by date/odometer are optional and not a fleet-maintenance system. Tests: maintenance conflict, retirement, incident block, return-inspection failure.

---

# Guide: Parallel work plan

Phase 0 blocks implementation. Afterwards agents work independently and meet at each gate. The Notch Pay spike runs in parallel with Phases 1-2.

| Phase | Backend agent | Frontend agent | Exit gate |
|---|---|---|---|
| 0 Contract | Endpoint/schema brainstorm, stub routers, spec export | Review journeys/spec, generate types, run Prism | Both approve OpenAPI |
| 1 Fleet and media basics | Models, Unfold vehicle admin, localized fleet endpoints, stub media | Home, fleet list, vehicle detail on mock | Browse vehicles and gallery |
| 2 Availability and quotes | Rate rules, overlap constraints, availability and quote service | Date/branch search, filters, quote summary | Concurrent availability tests pass |
| 3 Booking and payment | Holds, booking creation, provider interface, fake provider, Notch Pay adapter, webhook, status | Booking form, pending/success/failure | E2E on fake provider, then Notch Pay test mode (spike results recorded) |
| 3b Refunds and cancellation | Cancellation requests, refund claim flow, refund jobs | Cancellation request, refund claim page | Claim, double-claim and failed-refund tests pass |
| 4 Accounts | Session auth, neutral registration, verification, history, guest lookup | Login, register at booking, history, tracking | Cookie/CSRF flow works across real domains |
| 5 Fleet operations | Inspections, maintenance, extensions, fees, deposit ledger | Booking management, customer changes | No conflict or invalid transition |
| 5b Vehicle sales | SaleListing, inquiries, test drives, sale reservations (row-locked, deposit via provider interface), ownership-transfer checklist, sale jobs | Buy section: listings, detail, inquiry, test-drive and reservation flows | Concurrent reservation test passes; one active reservation per listing |
| 6 Media pipeline | R2 intents, worker, derivatives, private evidence | Responsive images, video player, admin status | Security and media budgets pass |
| 7 Jobs and notifications | Cron jobs, Resend templates, reminders, reconciliation | Reminder/status messaging | Jobs idempotent and observable |
| 8 Compliance and hardening | Consent, retention, 2FA, audit, load/concurrency/security tests | Accessibility, SEO, Core Web Vitals | Production readiness review |

Open questions do not block the contract. Numeric values for rate limits, session length and token lifetimes are proposed by the backend agent in `NOTES.md` and approved at the review gate.

---

# Guide: Phase 0 contract brief

Give the backend agent this entire guide, then this prompt:

```text
Role: backend contract author for the auto-rental monorepo described in this document. Read the entire guide first.

Task: produce the complete API contract as Django Ninja routers (one per app under apps/<app>/api/), Pydantic schemas and an exported /contract/openapi.json. Stub handlers only, returning realistic example data. No business logic.

Step 1: brainstorm every customer, staff, payment, refund, media, inspection, maintenance, cancellation, extension and background-job journey. List every frontend request, endpoint, schema, enum, error code, auth/CSRF requirement, rate limit, idempotency rule and cache policy. Output the list for review and flag gaps and owner decisions.

Step 2: write the contract using the coverage checklist. Every endpoint needs a tag, stable operation ID, description, request/response schemas, security requirements, error responses with codes and realistic examples Prism can serve.

Step 3: write /contract/CHANGELOG.md and /contract/NOTES.md: state machines, error catalog, pricing formula, date/time semantics, availability overlap strategy, media manifest, object access policy, rate limits, cache rules, retention questions, proposed defaults and unresolved owner decisions.

Done means every journey traces to endpoints, nothing is left as TODO, the spec exports cleanly, types generate, Prism serves every operation, and both agents approve the brainstorm and contract.
```

## Coverage checklist

- Fleet: categories, vehicle list/filter/sort/pagination, detail by slug, public media manifest (renditions), branches, featured fleet, sitemap feed.
- Sales: listings list/filter/sort/pagination, detail, sitemap feed, inquiry, test-drive slots and booking, reservation create/status/retry/cancel, buyer history, deposit payment instructions, sale state machines and transitions.
- Availability: interval/branch validation, buffers, maintenance blocks, active holds, overlap conflicts.
- Pricing: rate plan/version, billable units, approved fees, security deposit, itemized quote, re-quote, stale-quote errors, rental config endpoint (including terms version).
- Booking: create (idempotent), status polling with hints, guest lookup (captcha), customer history/detail, cancellation, retry payment, pay balance, extension quote/confirm, driver details, allowed transitions.
- Payments: provider-neutral payment instructions shape (optional operator, USSD code, status), provider webhook (excluded from client), fake provider behavior, transaction-status verification, duplicate/delayed callbacks, amount mismatch, security-deposit ledger.
- Refunds: claim lookup, claim, manual request, status; refund/request enums and transitions.
- Accounts: csrf, register (neutral 202), login, logout, me, update me, password reset, email verification, deactivate, export, session authorization.
- Driver data: approved fields only, secure document upload/access, verification state, consent, retention metadata.
- Pickup/return: checklist, odometer, fuel/battery, photos/video, acknowledgement, dispute, finalized report.
- Maintenance: create/update/cancel blocks, conflict checks, unavailable/retired, service status.
- Media: upload intent, complete upload, processing status, public manifest, admin retry/approve/remove, private evidence access, cleanup/reconciliation.
- Operations: `/healthz` (database-free), secured `/internal/jobs/run`, secured media processing entrypoint, audit events.
- Email: confirmation, payment received, pickup/return reminders, overdue, cancellation, extension, refund claim link, refund paid, deposit updates, existing-account notice, verification, staff alerts, sales inquiry received, test drive confirmed/reminder, reservation confirmed/expired/cancelled.
- Schemas: Vehicle, VehicleSummary, VehicleMedia, MediaRendition, Branch, AvailabilityRequest/Result, RatePlanSummary, Quote, BookingRequest/Response, Booking, BookingStatus, Payment, PaymentInstructions, Refund, RefundRequest, SecurityDepositLedger, DriverProfile, Inspection, InspectionMedia, MaintenanceBlock, User, ConsentRecord, SaleListing, SaleListingSummary, SaleInquiry, TestDriveSlot, TestDriveBooking, SaleReservation, VehicleDocumentSummary, ErrorEnvelope, Pagination, Money (integer XAF).
- Errors: `vehicle_unavailable`, `quote_expired`, `quote_changed`, `invalid_rental_window`, `branch_closed`, `maintenance_conflict`, `booking_hold_expired`, `idempotency_conflict`, `payment_failed`, `provider_unavailable`, `payment_amount_mismatch`, `unsupported_phone`, `payment_limit_exceeded`, `cancellation_not_allowed`, `extension_unavailable`, `refund_link_expired`, `refund_already_claimed`, `document_access_denied`, `media_validation_failed`, `media_processing_failed`, `captcha_failed`, `rate_limited`, `email_not_verified`, `terms_outdated`, `listing_unavailable`, `listing_reserved`, `reservation_expired`, `test_drive_slot_unavailable`, `sale_deposit_not_allowed`, `auth_required`, `csrf_failed`, plus any discovered.
- Cross-cutting per endpoint: auth, CSRF, idempotency, rate limit, caching (Cache-Control/ETag for public fleet, no-store for private), localization (`lang`, localized fields, locale on bookings and users, cache keys by `lang`), privacy, audit.
- Reference data: the agent finds an authoritative source for branch/city lists if a city field is used, names its sources, and seeds from it.
- Not in the contract: any admin API (Django admin with Unfold covers it) and any direct provider call from the browser.

Review gate: both agents read the brainstorm list and the spec, raise gaps, and approve before any implementation phase starts.

---

# Prompts: usage

Prepend this context block to every prompt:

```text
Stack: Next.js App Router + TypeScript + Tailwind CSS on Cloudflare Workers via OpenNext; Bun is the required frontend package manager and local JavaScript/TypeScript runtime (`bun install`, `bun run`, `bunx`; commit `bun.lock` only); async Django Ninja API served by Granian on Render; Neon Postgres via Django ORM; Notch Pay mobile money in XAF behind a provider interface (integer amounts); Cloudflare R2 for media; Resend for email; Django admin with Unfold. Format all frontend source and configuration with Prettier through Bun, and format/lint all backend Python with Ruff. Every HTTP-exposing Django app owns an `api/` package containing `serializers.py`, `views.py` and `urls.py`; `config/urls.py` only composes app routers. Django settings are split into `config/settings/base.py`, `local.py`, `production.py` and `test.py`. Python dependencies are split into `requirements/runtime.txt`, `development.txt` and `test.txt`, with usage and update policy documented in `requirements/README.md`. /contract/openapi.json is the source of truth. Mobile-first, bilingual storefront (fr default, en), timezone Africa/Douala. This is a vehicle rental and vehicle sales platform, not generic ecommerce: rentals are time intervals for vehicles and sales are single-unit listings with reservation holds; availability is concurrency-sensitive, quotes expire, and pickup/return inspections and maintenance blocks affect availability. No client-supplied totals. Media originals, documents and private evidence are separate from public derivatives. Read the whole build guide and /contract/NOTES.md before acting.
```

Append to implementation prompts:

```text
Return production-oriented code: models, migrations, per-app api/serializers.py, api/views.py and api/urls.py, domain services, admin config, tests and security notes. Never leave newly written or edited code unformatted. Run Prettier through Bun for frontend files and Ruff format plus Ruff check for backend Python; formatter and lint checks must pass before completion. Stay inside the approved contract; propose a spec change instead of working around it. Do not leave TODOs for required behavior. Include commands and files changed, formatter/linter results, test results and any unresolved owner decision. Do not silently decide legal or commercial policy.
```

Run the prompts in order: architecture, contract layer, data, admin, auth, storefront, availability and booking, payments, refunds, operations, media, jobs and deployment, localization, security, compliance, optimization, audit. **Prompts 7 to 12 must finish before the frontend and backend agents split.** The vehicle sales prompts (95-106) run after the booking, payment and refund prompts (40-56) because they reuse those services; prompt 94 (audit) runs last.

---

# Prompts: architecture and implementation (numbered)

## Architecture and planning

1. **Architecture review.** Design the production architecture for this rental platform covering fleet, vehicle sales listings, test drives, sale reservations, availability, rate plans, quotes, holds, bookings, payments, security deposits, refunds, inspections, maintenance, media processing, jobs and deployment. Separate confirmed decisions, proposed defaults and owner decisions.
2. **Monorepo scaffold.** Create `/contract`, `/frontend`, `/backend`. Each HTTP-exposing backend app gets an `api` package with `urls.py`, `serializers.py`, `views.py`. Split Django settings into `backend/config/settings/base.py`, `local.py`, `production.py` and `test.py`. Split locked Python dependencies into `backend/requirements/runtime.txt`, `development.txt` and `test.txt`, and document installation, inclusion and update rules in `backend/requirements/README.md`. Add scripts for spec export, type generation, Prism, tests and CI.
3. **Journey mapping.** Trace browse fleet, search dates, compare, quote, book, pay deposit, pay balance, pickup, extend, return, damage review, cancellation, refund claim, guest tracking, account history, document upload, media approval, maintenance block, sales inquiry, test drive, sale reservation, ownership handover and staff operations.
4. **Technical requirements.** Produce requirements with acceptance criteria for availability correctness, quote validity, payment reconciliation, media delivery, privacy and performance. List what is out of scope for v1.
5. **Decision register.** List missing commercial/legal decisions: billing units, deposits, cancellation, no-show, late return, mileage, fuel, driver eligibility, insurance, damage disputes, delivery fees, retention, refund capability, vehicle-versus-category assignment.
6. **Runtime configuration.** Configure Django ASGI/Granian on Render, Neon pooled runtime and direct migration URLs, SSL, psycopg 3, WhiteNoise for admin static files, Neon branch-per-environment, and document connection and cold-start constraints.

## Contract layer

7. Design the full API contract before implementation per the Phase 0 brief: resources, endpoints, schemas, enums, error envelope, pagination, idempotency, integer XAF money. Output a schema list and endpoint table.
8. Create Ninja routers and Pydantic schemas with stub handlers and stable operation IDs, grouped by app and tag, schemas in `api/serializers.py`, handlers in `api/views.py`, routers in `api/urls.py`; `config/urls.py` only composes them.
9. Add a command/make target to export `/contract/openapi.json` and a CI check that fails when the committed spec is stale.
10. Generate frontend types and an `openapi-fetch` client; wrap once for credentials, CSRF, error parsing and request IDs. Never hand-write API types.
11. Configure Prism with realistic examples and an environment switch between mock and real API.
12. Add Schemathesis, breaking-change detection and Playwright smoke tests using the fake provider and seeded vehicles/bookings.

## Database and backend data

13. Design the ER model for vehicles, localized content, media and renditions, branches, rate plans, fee rules, availability blocks, holds, bookings/snapshots, users/drivers, consent records, payments/events, deposit ledger, refunds/requests, inspections/evidence, maintenance, jobs, outbox, idempotency and audit. Include an ER summary and the index plan.
14. Implement Vehicle, VehicleTranslation, Branch and VehicleMedia with constraints, indexes, migrations and Unfold config.
15. Implement RatePlan and FeeRule with effective dates/versioning and a pure quote calculator. Keep unresolved policies configurable and disabled.
16. Implement Booking and BookingSnapshot: random public reference, requested/normalized UTC times, customer/driver snapshot, branch snapshots, rate version, itemized integer-XAF amounts, locale, terms version, status.
17. Implement Payment, PaymentEvent, Refund, RefundRequest and the security-deposit ledger with dedupe constraints, amount checks and sensitive-field rules.
18. Implement AvailabilityBlock and BookingHold with an explicit Postgres-safe overlap strategy (exclusion constraint or row lock plus recheck) and concurrent tests.
19. Implement Pydantic validation for intervals, branch, vehicle, phone/email, driver fields, locale, quote IDs, idempotency; phone normalization to +237; never accept authoritative totals.
20. Implement the single error envelope and exception mapping for validation, auth, CSRF, overlap conflicts, provider failures, stale quotes, media errors and unexpected errors.

## Django admin and fleet operations

21. Set up Unfold theme, branding, sidebar groups (Fleet, Bookings, Payments, Operations, Customers, Media, Audit), staff-only access.
22. Build Vehicle admin: search/filter, status, branch, category, media inlines, processing state, localized fields, archive/deactivate actions, read-only timestamps, thumbnails from the smallest rendition.
23. Build Branch and RatePlan admin with effective dates, validation and audit trail; prevent invalid overlapping rates per the approved priority strategy.
24. Build Booking admin with filters, customer-safe search, immutable snapshots, payment inlines, internal notes and guarded transition actions that follow the transition map.
25. Build the operations dashboard with indexed aggregations (see Admin and rental operations).
26. Define groups/permissions (owner, fleet manager, branch operator, mechanic, support, finance, sales agent) via data migration; restrict identity documents, payer numbers, refunds, rate changes and deposit actions.
27. Implement audit logs for price changes, overrides, payment/refund actions, document access, media approval/deletion, inspection changes and maintenance blocks; read-only to normal staff.

## Auth and accounts

28. Implement Django session auth, CSRF, register/login/logout/me/update-me, password reset and email verification. Test cookies across the real frontend/API domains.
29. Implement neutral registration and optional account creation at booking: identical responses and timing for new and existing emails, no session, verification and existing-account emails in both locales, password replacement for unverified accounts, verification link signs in. Test no response/timing difference.
30. Implement guest booking lookup with reference plus verified secondary factor or single-use token and a generic error.
31. Build frontend login/register, account menu, booking history and detail. Server Components forward cookies only where needed; private responses are never cached.
32. Implement account deactivation and data export with verified identity, rate limits, audit and retention rules; owner-only restricted view of deactivated users.

## Fleet storefront (mobile-first)

33. Build the homepage: hero, categories, featured vehicles, trust information, booking CTA. Server Components, localized metadata, mobile-first composition per the Visual Design Specification.
34. Build fleet search/list: pickup/return controls, branch, category, seats, transmission, fuel, price range, sorting; state in URL.
35. Build category and branch pages with SEO metadata, empty states and accurate local details.
36. Build reusable vehicle cards: optimized thumbnail, make/model, key specs, price basis, availability caveat, accessible link, 44px targets.
37. Build vehicle detail: responsive gallery, WebM/MP4 walkaround, specs, included mileage, policies, branch info, date-aware quote CTA. Never imply availability before server validation.
38. Add structured data and per-locale SEO, sitemap, canonical, hreflang, Open Graph; accurate schema types only.
39. Review the customer journey for trust, clarity, accessibility, mobile usability, conversion and clear disclosure of fees and deposits.

## Availability, pricing and booking

40. Implement availability search across interval, branch/category, maintenance, bookings, active holds and buffers; optimize SQL; add concurrency tests on Postgres.
41. Implement the pure quote calculator using approved settings: itemized rental, fees, security deposit, due-now, balance, expiry; document rounding and time-boundary behavior.
42. Implement quote creation/retrieval and stale/expired behavior; recompute everything at booking creation.
43. Implement booking creation: idempotency, sync atomic availability recheck, hold, snapshot, payment attempt, commit, then provider call. Never call a provider with a transaction open.
44. Build the booking form: accessible date-time pickers with timezone labels, branch, driver/contact fields, separate unticked consent checkboxes, Turnstile, quote breakdown, review step before confirmation, new Idempotency-Key per attempt, `error.fields` mapped to form errors.
45. Implement booking status polling with stop conditions, timeout state, retry-payment and safe guest lookup; polling follows API hints; no private data leaks through public references.
46. Implement cancellation per the approved policy; if not approved, expose a staff-reviewed request, not invented automatic refunds.
47. Implement extension quote and confirmation with a new availability check, payment if required, audit trail; reject or escalate next-booking conflicts.
48. Add tests for quote expiry, rate changes, concurrent holds, cancellation, duplicate submissions, late successful payment, maintenance conflict and timezone boundaries.

## Payments and financial flows

49. Run the Notch Pay verification spike per the guide; record the exact auth headers, charge method/body, status, webhook, signing and payment-linked refund behavior and written answers in the guide and `NOTES.md`. Do not rely on community SDK assumptions.
50. Define the provider interface and build the async Notch Pay adapter (shared httpx client, timeouts, typed errors, retries only on safe calls, separate test/live credentials, `cm.mobile` charge) plus the fake provider; one test suite across adapters.
51. Implement payment initiation for the owner-approved due-now amount; persist the attempt before external calls and reconcile failures safely.
52. Implement the webhook: bounded, untrusted, durable enqueue then 200, dedupe, authoritative status lookup, reference/amount/currency/kind checks, atomic finalization with row locks. Test forged, repeated, delayed and out-of-order callbacks.
53. Implement balance and extension payments as separate idempotent attempts.
54. Implement the security-deposit ledger and release workflow only after the owner approves the mechanism and capability is verified. Never claim pre-authorization without proof.
55. Implement refunds and the claim flow: Refund model, hashed single-use token, 3-day expiry, masked destination, idempotent claim, status job, reissue in Unfold, manual request after expiry; manual-review fallback if automated refund is unavailable. Test double claims and failed refunds.
56. Build customer payment/status screens for pending, success, failure, expired and needs-review states with retry instructions (phone-check hint after ~120 s, retry offer after timeout) and support contact; build the refund claim page.

## Pickup, return, damage and maintenance

57. Model inspection templates and reports: odometer, fuel/battery, accessories, checklist, notes, actor, timestamp, acknowledgement.
58. Build the staff pickup workflow: booking/payment checks, identity verification state, baseline evidence, transition to `in_progress`.
59. Build the return workflow: actual return time, odometer/fuel, matching evidence, fee calculation, acknowledgement.
60. Implement damage dispute/incident workflow: private evidence, logged access, no automatic unapproved charges.
61. Implement maintenance blocks, unavailability and retirement, with a privileged rescheduling flow and affected-customer notifications.
62. Implement late-return, mileage and fuel calculations as pure functions with unit tests; features stay disabled until approved.
63. Build staff operations pages: pickup queue, returns due, overdue, cleaning/maintenance, bookings needing review.

## Media upload, processing and storage

64. Configure R2 private originals, public derivatives and private evidence/documents; store keys and metadata in Neon; no secrets or hard-coded full URLs.
65. Implement presigned upload intents scoped to one random key, content type, size and prefix; verify the object after upload; direct browser-to-R2 for large media.
66. Implement validation: magic bytes, actual MIME, dimensions, duration, codecs, size, checksum, safe filenames, pixel caps.
67. Build the idempotent pipeline: original → validation → derivatives → manifest → ready/failed, with retries, backoff, alerts.
68. Generate responsive WebP/AVIF at suitable widths without upscaling; strip EXIF/GPS from public derivatives; thumbnails, hero crops, posters, optional placeholders; content-hashed immutable keys.
69. Generate WebM and MP4 renditions plus poster/thumbnail in an FFmpeg-capable worker or service; never in request handlers; document the runtime decision and cost.
70. Build the public media manifest (renditions only, no private keys or originals).
71. Integrate Next.js `Image` with a Workers-compatible loader or pre-generated URLs; `sizes`, priority only for LCP, lazy below the fold; verify on the real adapter.
72. Build the video component: poster, aspect ratio, lazy loading, `preload` policy, controls, reduced motion, captions where needed.
73. Build admin media status, preview, approve/reject, replace, retry and cleanup; DB/R2 orphan reconciliation.
74. Add media security/performance tests per the acceptance list.

## Notifications, jobs and deployment

75. Build the jobs/outbox tables and secured `/internal/jobs/run` with `skip_locked` claiming, retries/backoff, idempotent handlers, bounded batches and observability.
76. Implement Resend (async httpx) with FR/EN templates for every email listed in the coverage checklist; immediate send after payment commit, cron retry.
77. Implement scheduled jobs (hold/quote expiry, stale-payment reconciliation, reminders, overdue review, refund/deposit reconciliation, media retries, retention cleanup, purge jobs).
78. Build the Cloudflare Worker: Cron Trigger calling the job runner with the secret, failure alert, configurable cadence, plus a second trigger pinging database-free `/healthz`.
79. Configure deployment: OpenNext on Workers (check version support and bundle limits), Render/Granian, Neon branches, R2 buckets and media domain/CORS, Resend, secrets, domains from environment variables, staging/production separation.
80. Write the runbook: migrations, rollback, media recovery, joint DB + R2 restore, webhook recovery, credential rotation, breach response.

## Localization, security, compliance

81. Implement `/fr` and `/en` routing, catalogs, switcher, locale-aware XAF/date formatting, canonical/hreflang, fallback; verify the i18n library on OpenNext.
82. Localize backend content (`lang` parameter, fallback, cache keys, FTS configuration), emails, booking confirmations, policies, static pages and error codes; store locale on booking and user.
83. Implement Turnstile and per-endpoint rate limits with 429/`Retry-After`; webhook uses its own verification rather than browser CSRF, with body size limits.
84. Implement auth hardening: validators, hasher, login throttling, generic errors, session rotation, single-use hashed expiring tokens; enforce the 403 `email_not_verified` rule.
85. Enforce staff TOTP 2FA (check Unfold compatibility), least privilege, security headers, log redaction, per-environment secrets, dependency scanning, tested Neon restore, R2 lifecycle/retention.
86. Implement consent records and `terms_outdated` (409), separate unticked checkboxes, consent history in Unfold.
87. Implement privacy operations: restricted deactivated-user view, `legal_hold`, retention settings with anonymizing purge jobs, early-anonymization action on approved erasure only, processing register, processors list, breach runbook.
88. Implement structured observability: latency, DB queries, pool, booking conflicts, payment/webhook failures, job lag, media queue depth, conversion errors, R2 mismatch, with PII redaction.

## Optimization, SEO and review

89. Optimize the database: indexes listed in the guide (partial, GiST/exclusion, per-language GIN) created concurrently; query-count tests; purge jobs.
90. Optimize the backend: ETag/304, shared httpx client, short-TTL caches, compression, page-size caps, job time budget, webhook path deferring email.
91. Optimize the frontend: srcset from renditions with a custom loader, correct dimensions, LCP priority only where needed, dynamic imports, font subsets, TanStack Query stale times, polling pause in hidden tabs, bundle and Lighthouse budgets in CI.
92. Run accessibility and localization audits: keyboard use, date/time inputs, form errors, screen readers, captions, reduced motion, 320-390 px widths in French and English.
93. Run a performance pass against the guide's budgets: Core Web Vitals, media bytes, bundle, caching, N+1, indexes, Neon cold starts, blocking work in async views, upload path, CDN hit ratio, mobile data usage.
94. Run a senior production audit ranking highest-risk issues across availability races, sale-reservation races, rental/sale conflicts for the same vehicle, pricing integrity, payments and webhook handling, refund/deposit destinations and tokens, PII/documents, media pipeline, cookie/CSRF/CORS, Django settings, job-runner secret, rate limits/captcha coverage, admin permissions/2FA, consent and data-protection duties, maintenance, observability, backups and runbooks.

## Vehicle sales

95. Implement SaleListing and VehicleDocument models with the partial unique index, constraints, indexes (partial on available listings by status/branch/price, per-language GIN if search is offered), migrations and Unfold admin, including the guarded "move fleet vehicle to sale" action that checks future bookings.
96. Build the Buy storefront: listing list with URL-state filters, cards, detail with gallery and video, disclosures, inquiry / test-drive / reserve CTAs, per-locale SEO and accurate Car/Offer structured data, mobile-first, with clear Rent versus Buy separation.
97. Implement the inquiry endpoint (captcha, consent, rate limit) and the staff pipeline in Unfold, with the unanswered-inquiry alert and retention setting.
98. Implement test-drive slots and booking on the overlap engine (`AvailabilityBlock` type `test_drive`), staff confirmation, reminders and no-show handling, with concurrent-slot tests.
99. Implement SaleReservation creation: listing row lock, partial unique index, 15-minute `expires_at`, price snapshot, payment attempt through the provider interface, commit before the external call. Add a concurrency test where two buyers reserve the same listing.
100. Implement webhook finalization for `sale_reservation_deposit` (reservation and listing `reserved`), plus late payment after expiry → `needs_review` and refund. Test duplicate, forged, delayed and amount-mismatch callbacks.
101. Implement reservation expiry and cancellation jobs, reminders and the refund hooks (settings-driven; forfeiture disabled until approved).
102. Build the ownership-transfer checklist and completion workflow in admin: private documents and buyer ID, offline balance recording, handover, listing and vehicle `sold`, deposit applied, full audit.
103. Build the frontend reservation flow: price and deposit summary, separate unticked consent checkboxes, review step, polling, retry, status pages (pending, reserved, expired, needs review) and the refund claim integration.
104. Implement FR/EN Resend templates for inquiry received, test drive confirmed/reminder, reservation confirmed/expired/cancelled, refund claim link and staff alerts.
105. Add sales tests: state transitions, one active reservation per listing, rental/sale conflict, sold vehicle removed from rental search, buyer-document privacy, rate limits and captcha coverage.
106. Add sales compliance items: consent records and terms versions for sale and reservation, disclosures, processing-register entries, buyer-document retention, and a counsel checklist for the sales owner decisions.

---

# Decisions AI must not make alone

- Rental terms, insurance, liability, driver eligibility, required identity documents and retention.
- Booking deposit and security-deposit amount/mechanism, due dates and release timing.
- Cancellation/no-show refunds, any non-refundable portion, late-return penalties, mileage/fuel/cleaning/damage fees.
- Rental unit and rounding rules, operating hours, buffers, extension policy.
- Vehicle versus category assignment at booking.
- Notch Pay's actual supported operations, fees, settlement and withdrawal terms; whether to switch providers.
- Tax display, staff permission boundaries, privacy/legal compliance, evidence retention, Data Protection Authority filings and transfer authorizations.
- Media processing provider/budget and upload limits.
- Production secrets, retention windows and deletion policy.
- Sales: deposit amount, reservation period and forfeiture, what vehicles may be sold, vehicle history and condition claims, seller authorization, sale agreement and warranty terms, balance payment methods, cash limits, registration/transfer responsibilities, test-drive insurance.

**Definition of done:** Prettier checks pass for the frontend and Ruff format/check pass for backend Python; the API contract is approved; concurrent availability and single-unit sale-reservation tests pass on Postgres; fake-provider booking/payment E2E passes and the Notch Pay spike results are recorded; webhook replay is safe; refund claims only reach the original payer number; no private documents/media leak; public images and videos use tested optimized derivatives; failed media jobs can be retried; customer/staff flows are bilingual, mobile-first and accessible; consent, retention and processing-register items are in place for counsel review; backup/restore and deployment runbooks are tested; unresolved owner decisions are listed rather than guessed.
