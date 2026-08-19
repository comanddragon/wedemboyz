# Product

## Register

product

## Users

Two audiences share this codebase under one visual system:
- **Customers** in Yaoundé booking laundry pickup/delivery, comparing WEDEMBOYZ against DIY laundry or an informal option — mostly mobile, price-sensitive, need quick trust signals (see PRODUCT.md context below).
- **Staff/admin** (ops, dispatch, support) running the business day-to-day: triaging orders, resolving payment/refund issues, staffing the chat inbox. They're in a task, at a desk, repeatedly — familiarity and speed matter more than persuasion.

This file's admin scope is the staff-facing surface at `/admin/*`.

## Product Purpose

WEDEMBOYZ Lavomatique is a pickup-and-delivery laundry service. The admin surface exists so staff can run operations: see and update order status, keep an eye on payments/refunds, staff the customer chat inbox. Success looks like a staff member finding what they need in one glance and completing an action (update a status, jump into a chat) in one or two clicks — without needing training.

## Brand Personality

Inherited from the customer-facing brand (friendly, local, warm, "the neighborhood laundry spot"), but the admin surface is a tool, not a pitch: it should feel calm, orderly, and fast. The warmth shows up in restraint and craft (the same navy/gold/Fold-Line vocabulary as the rest of the site), not in persuasive copy or celebratory motion — staff don't need to be sold on booking a pickup.

## Anti-references

- Generic gray SaaS admin templates (the interface shouldn't abandon the brand's navy/gold/crease identity just because it's "just the admin").
- Anything that borrows the customer site's celebratory/marketing motion for routine staff actions (confetti on a status update, etc.) — that belongs to booking, not ops.
- Fabricated data or endpoints: several admin sections (analytics, customers, staff management, discount campaigns) have no backend yet. Never invent numbers or actions that aren't real; design honest, well-crafted empty/"not yet available" states instead.

## Design Principles

1. **Reuse, don't reinvent.** The `components/ui` design system (Card, Button, StatusBadge, Field, CreaseDivider, ServiceIcon, EyebrowLabel) and the dashboard patterns (StatCard, sidebar nav) already exist and are on-brand — admin pages extend them rather than introducing a parallel visual language.
2. **Honesty over polish-by-fabrication.** Where a backend capability doesn't exist yet, say so clearly and design a good "not yet" state rather than faking data.
3. **Task speed over delight.** Staff repeat these screens daily; optimize for scan-ability, clear status vocabulary, and minimal clicks over any decorative flourish.
4. **One consistent shell.** Admin should feel like a sibling of the customer dashboard (same shell logic, same sidebar mechanics) — not a different product bolted on.

## Accessibility & Inclusion

Standard WCAG 2.1 AA (per CLAUDE.md): body text ≥4.5:1 contrast, visible focus states with the same care as hover states, `prefers-reduced-motion` respected, never color-alone for status meaning (StatusBadge already pairs color with text label).
