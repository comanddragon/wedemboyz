# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Customers** in Yaoundé booking laundry pickup and delivery, often on mobile and comparing Wedemboyz Lavomatique with doing laundry themselves or using an informal provider. They need clear prices, trust signals, and a quick booking path.
- **Owner and staff/admin users** managing operations remotely: reviewing and updating orders, handling payments and refunds, monitoring inventory and finance, managing staff, and responding to customer chat.

## Product Purpose

Wedemboyz Lavomatique is a pickup-and-delivery laundry service. The customer experience supports discovery, booking, payment, and order follow-up. The admin experience supports daily operations and should let the owner or a staff member find what needs attention and complete routine actions with minimal training.

## Positioning

The product combines a customer-facing laundry pickup service with a connected operational workspace for the business owner and staff, keeping booking, garment processing, delivery, payment, customer support, inventory, and business records in one system.

## Operating Context

- Customers primarily access the service remotely, with mobile use treated as a first-class context.
- The owner uses the deployed admin workspace remotely to test and manage the site's functionality before full live operation.
- Staff/admin work is repetitive and task-focused: triaging orders, resolving payment or refund issues, managing operational records, and staffing the customer chat inbox.
- `/admin/*` is the staff-facing operational surface; customer and public routes share the same product and brand system.

## Capabilities and Constraints

- The application includes customer accounts, booking and scheduling, orders, payments and refunds, subscriptions, discounts and loyalty, notifications, chat, staff operations, finance, inventory, and administrative reporting.
- Seeded production data is demonstration/test data for the owner. It must remain distinguishable from real customer activity and must not trigger real payment, email, SMS, WhatsApp, or push-provider actions.
- Do not fabricate unsupported endpoints or capabilities in the interface. Where a backend capability is unavailable, use an honest unavailable or empty state.

## Brand Commitments

- Product name: **Wedemboyz Lavomatique**.
- The established personality is friendly, local, warm, and orderly—the neighborhood laundry service presented with professional operational discipline.
- Existing logo assets and the navy/gold identity are authoritative brand assets.
- The admin workspace should feel calm and efficient rather than promotional, while remaining visibly part of the same brand.

## Evidence on Hand

- Brand assets: `public/logo.png` and `public/icon-mark.png`.
- Existing public, customer, and admin interfaces in the application are the current functional and content evidence.
- The repository contains an interconnected Django seed-data command for exercising supported workflows. Seed records are illustrative operational data, not customer testimonials or proof of real transactions.

## Product Principles

1. **Operational truth over fabricated polish.** Show real system states and supported actions; label test data clearly.
2. **Fast routine work.** Repeated owner and staff tasks should be scannable and require few steps.
3. **One connected service.** Customer booking and back-office operations should behave as parts of one coherent workflow.
4. **Remote-ready management.** The owner must be able to test and manage core functionality reliably away from the physical business.
5. **Brand consistency without operational distraction.** Preserve the friendly Wedemboyz identity while keeping admin work calm and focused.

## Accessibility & Inclusion

Target WCAG 2.1 AA: body text must meet 4.5:1 contrast, focus states must be visible, reduced-motion preferences must be respected, and status meaning must never rely on color alone.
