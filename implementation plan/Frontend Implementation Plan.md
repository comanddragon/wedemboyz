# Frontend Implementation Plan

## Goal

Deliver the bilingual, mobile-first rental and vehicle-sales storefront described in the build guide. The frontend consumes only the approved OpenAPI contract, treats the backend as authoritative for availability and money, and deploys through OpenNext to Cloudflare Workers.

## Non-negotiable implementation rules

- Use Bun as the package manager and local JavaScript/TypeScript runtime: `bun install`, `bun run <script>` and `bunx <tool>`.
- Commit `bun.lock`; do not introduce npm, Yarn or pnpm lockfiles.
- Pin the Bun version in the repository and CI.
- Format all supported frontend source and configuration files with Prettier through Bun. Run the write command after edits and require the Prettier check to pass before completion and in CI.
- Use Next.js App Router, TypeScript in strict mode, Tailwind CSS, TanStack Query for server state and Zustand only for small non-authoritative client state.
- Generate API types from `/contract/openapi.json`; never hand-write transport types or edit generated types.
- Default locale is French. All public routes live below `/fr` or `/en`.
- Never calculate authoritative totals or infer availability in the browser.
- Meet the accessibility, privacy, responsive-layout and performance requirements in the build guide.

## Planned frontend structure

```text
frontend/
  package.json
  bun.lock
  bunfig.toml
  next.config.ts
  open-next.config.ts
  src/
    app/
      [locale]/
        (marketing)/
        rent/
        buy/
        bookings/
        account/
        refunds/
    api/
      schema.d.ts
      client.ts
      errors.ts
      csrf.ts
    components/
      ui/
      layout/
      fleet/
      booking/
      sales/
      payments/
      media/
    features/
      auth/
      availability/
      quotes/
      bookings/
      sales/
      refunds/
    i18n/
      routing.ts
      request.ts
      messages/fr.json
      messages/en.json
    lib/
      config.ts
      format.ts
      query-client.ts
      telemetry.ts
    stores/
      search-draft.ts
    styles/
      globals.css
  tests/
    unit/
    integration/
    e2e/
```

The exact route groups can change during scaffold work, but feature ownership and API boundaries should remain clear.

## Delivery sequence

### F0 — Contract review and toolchain

Depends on the backend's contract draft, not backend business logic.

- Review every customer journey against the endpoint/schema coverage list.
- Scaffold Next.js with Bun and pin the Bun version.
- Add scripts for dev, build, lint, type-check, unit tests, Playwright, OpenAPI type generation, Prism and OpenNext preview/deploy.
- Generate `src/api/schema.d.ts` with `openapi-typescript` and create one `openapi-fetch` wrapper.
- The wrapper supplies API base URL, credentials, CSRF, correlation/request ID and normalized error parsing.
- Configure the mock/real API environment switch and run Prism from the committed spec.
- Configure strict environment validation and prohibit secrets in `NEXT_PUBLIC_*` values.

Exit gate: a Bun-only clean install succeeds; types generate without manual edits; the app can call at least one Prism endpoint through the wrapper.

### F1 — Design foundation, localization and app shell

- Convert the Visual Design Specification into Tailwind theme tokens and reusable primitives.
- Build semantic typography, buttons, links, inputs, dialogs, drawers, cards, badges, skeletons, error summaries and status components.
- Implement `/fr` and `/en` routing, locale detection/redirect, language switcher and message catalogs.
- Add locale-aware XAF, date/time and duration formatting for Africa/Douala.
- Build header, Rent/Buy separation, category navigation, mobile drawer, footer, support/legal links and route-level loading/error/not-found boundaries.
- Establish metadata helpers for canonical URLs, hreflang and Open Graph.

Exit gate: the shell works at 320, 390, 768 and 1440 CSS px in French and English; keyboard navigation and visible focus pass the baseline audit.

### F2 — Public rental discovery

- Build homepage sections, trust information, featured inventory and rental search entry.
- Build category and branch pages.
- Build fleet results with URL-owned filters, sorting, pagination and resilient empty/error states.
- Build vehicle cards and detail pages with approved media renditions, accurate price-basis language and no unverified availability claims.
- Implement responsive image loading, walkaround video, placeholders, dimensions and LCP priority rules.
- Add public-data revalidation and cache keys that include locale and all relevant search dimensions.

Exit gate: users can browse from home to a vehicle detail using the mock API; accessibility and media payload budgets pass.

### F3 — Availability, quote and booking

- Build branch/date-time search with explicit Africa/Douala labeling and accessible controls.
- Submit availability requests and render backend results without copying them into Zustand.
- Build itemized quote summary, expiry handling and re-quote flow.
- Build the booking form, driver/contact inputs, separate unticked consent fields, Turnstile, review step and terms-version handling.
- Generate a new idempotency key per deliberate submission attempt; preserve it only for safe retries of that attempt.
- Map backend `error.fields` to controls and `error.code` to localized messages.
- Build pending, successful, failed, expired and needs-review states; honor polling hints and stop/pause rules.

Exit gate: fake-provider booking E2E passes for success, failure, retry, duplicate submission, expired quote and unavailable vehicle.

### F4 — Authentication and customer self-service

- Build sign-in, neutral registration, email verification, password reset and sign-out.
- Support optional account creation during booking without changing the neutral-response behavior.
- Build guest lookup, booking tracking, account navigation, booking history/detail, balance payment, cancellation request and extension flows.
- Build profile rectification, data export and account deactivation.
- Ensure private Server Component requests forward cookies only when needed and private responses are never cached.

Exit gate: cookie and CSRF tests pass against representative production domains; unverified, inactive and unauthorized states are covered.

### F5 — Refunds and payment recovery

- Build payment retry and balance-payment interfaces with clear mobile-money instructions.
- Build refund claim lookup/confirmation using the masked original payer number; never render a destination-edit field.
- Build expired-link/manual-request, processing, paid and failed states.
- Add timeout and support guidance without claiming payment or refund success before backend confirmation.

Exit gate: refund claim, repeat claim, expired claim and failed-provider E2E scenarios pass.

### F6 — Vehicle sales

- Build Buy landing/listing pages with URL-state filters and clear separation from rental inventory.
- Build sales cards and detail pages with disclosures, condition, mileage, media and accurate structured data.
- Build inquiry and test-drive flows with consent, Turnstile and rate-limit handling.
- Build reservation review, deposit payment, polling, retry, expiry, cancellation and refund integration.
- Build authenticated buyer reservation history where supplied by the contract.

Exit gate: two simulated buyers cannot both complete the same reservation journey; unavailable, expired and needs-review states are understandable and recoverable.

### F7 — SEO, resilience and production hardening

- Generate localized sitemap feeds, canonical/hreflang metadata and accurate Vehicle/Car/Offer structured data only where permitted.
- Complete WCAG-focused keyboard, screen-reader, focus, contrast, reduced-motion and form-error testing.
- Test French expansion, long vehicle names, large XAF amounts and status text at narrow widths.
- Enforce Lighthouse and bundle budgets in CI; inspect the OpenNext Worker bundle.
- Add consent-aware analytics, sanitized error reporting and Core Web Vitals capture without personal data.
- Verify CSP and other browser security headers with media, Turnstile and API origins.
- Run Playwright smoke tests against staging with the fake provider before release.

Exit gate: production build and OpenNext preview pass; no high-severity accessibility, privacy, contract or performance defects remain.

## Testing strategy

- Unit: formatters, error localization, polling decisions, idempotency-attempt behavior and small state stores.
- Component/integration: forms, locale variants, validation mapping, API-wrapper behavior and status transitions with mocked contract responses.
- Contract: regenerate types in CI and fail on drift; validate mock examples used by user journeys.
- E2E: French and English critical paths on mobile and desktop using Playwright and the fake provider.
- Visual/accessibility: stable screenshots for core pages plus automated and manual keyboard/screen-reader checks.
- Performance: Lighthouse CI, Worker bundle budget and representative media-byte checks.

## Required backend handoffs

- Approved `/contract/openapi.json`, examples and error catalog.
- `/contract/NOTES.md` with state machines, cache rules, polling hints, rate limits, terms versions and unresolved policy gates.
- Stable fake-provider behavior and deterministic seed data.
- Representative media manifests and localized content.
- Confirmed production domains, cookie domain, CORS/CSRF origins, Turnstile configuration and API base URLs.

## Frontend definition of done

- Every approved customer journey is implemented in French and English.
- The Bun-only install, generation, test and build workflow succeeds from a clean checkout.
- No authoritative price or availability logic exists in frontend code.
- Generated API types are current and untouched by hand.
- Critical journeys pass Playwright against the fake provider and staging.
- Accessibility, privacy, SEO, mobile layout, media and performance gates in the build guide pass.
