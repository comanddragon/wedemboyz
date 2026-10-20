# Wedembyz Functionality Updates

Audit of the `backend` (Django/DRF) and `frontend` (Next.js admin panel) code, listing the missing model fields, missing backend behaviour and missing admin-panel functionality.

**How to read this:** Each item says what is missing today, what to add, and a priority.
- **P0**: wrong or unsafe behaviour today, or it blocks day-to-day running of the laundry.
- **P1**: important business functionality that is missing.
- **P2**: polish and nice-to-have.

Everything below was confirmed by reading the code. File paths are given so each item can be found.

---

## 0. Summary: the biggest gaps

| # | Gap | Priority |
|---|-----|----------|
| 1 | Inventory items have no cost or price data, and there is no supplier, purchase or valuation tracking | P0 |
| 2 | Supply usage (detergent, softener, bags) is never recorded automatically. It only exists as a manual `adjust` call, and nothing links usage to orders or machines | P0 |
| 3 | The order status endpoint accepts any status in any order. The frontend comments claim `services.order_flow.ALLOWED_TRANSITIONS` exists, but that module does not exist | P0 |
| 4 | Cancelling an order does not give back subscription kilos, void promo usage, or reverse credit charges or payments | P0 |
| 5 | Refunds never move money or restore credit, loyalty points or subscription kilos. They only flip a status | P0 |
| 6 | The admin panel cannot approve, reject or process refunds, even though the backend endpoints exist | P0 |
| 7 | There is no admin way to record a payment against an order (cash, MoMo received at the counter, partial payments) | P0 |
| 8 | Orders have no staff assignee, driver, source (online or walk-in) or payment status. The admin orders list only filters the current page in the browser | P1 |
| 9 | Admin staff cannot manage schedules or drivers, view subscriptions, edit loyalty rules or the stamp card, or see campaign effects | P1 |
| 10 | Expenses are not linked to inventory purchases or suppliers, so stock purchases and expenses are entered twice or not at all | P1 |
| 11 | **New decision:** remove all payment gateways, record payments manually, book income when the order is placed, and add proper order payment states with clear frontend display (see section A, which overrides section 3 and parts of section 5) | P0 |

---

## A. Decision: manual payments, income booked at order time, proper payment states

> **Added after the first audit.** Three business decisions that change the payments design. Where this section conflicts with section 3 (Payments) or section 5 (Finance), **this section wins**. Section 3 items about gateways, webhooks, gateway refunds, gateway fees and payment-method tokens are superseded and should be skipped.

The three decisions:
1. Remove all payment-gateway integration. Payments are taken manually (cash, MoMo or Orange Money received on the shop's own number, bank transfer) and **recorded by staff**.
2. Income is recorded **when the order is placed**, not when it is paid.
3. Orders get proper payment states, shown clearly everywhere in the frontend.

### A.1 Remove all payment integration (backend)

**Delete:**
- `services/billing/` (`stripe_gateway.py`, `paypal_gateway.py`, `campay_gateway.py`, `__init__.py`).
- Webhooks: `apps/payments/api/views/webhooks.py`, `apps/payments/api/urls/webhooks.py`, and the `api/v1/webhooks/` include in `config/urls.py`. Delete the `process_webhook` task in `apps/payments/tasks.py`.
- `apps/payments/middleware.py` (`DevTestPaymentAmountMiddleware`, the dev-only trick that rewrites order totals for CamPay testing) and its entry in `MIDDLEWARE` in `config/settings/base.py`.
- Gateway settings in `config/settings/base.py`: all `STRIPE_*`, `PAYPAL_*`, `CAMPAY_*` keys, `PAYPAL_XAF_TO_USD_RATE`, and the checkout success/cancel redirect URL settings. Also remove the matching keys from `.env` files and deployment config.
- Dependencies in `requirements/runtime.txt`: `stripe`, `campay` (keep `requests` only if something else uses it). Frontend: `@stripe/react-stripe-js` in `package.json`.
- Customer-initiated payment: `PaymentInitiateSerializer` and `POST /payments/` for customers, the whole `PaymentMethod` model and its endpoints (`/payments/methods/...`, set-default), `generate_display_label`, and the `provider_token` and `ussd_code` fields.
- Subscription checkout and gateway lifecycle: `SubscriptionCheckoutView` (`/subscriptions/{id}/checkout/`), `renew_subscription`, `mark_subscription_cancelled`, and the `RECURRING_CAPABLE_GATEWAYS` logic. On `Subscription` remove `billing_cycle` auto-billing, `gateway`, `external_subscription_id` and `cancel_at_period_end` (or reinterpret `cancel_at_period_end` as "do not renew"). Subscriptions become: staff records the payment, then staff or the system activates it for 30 days; renewal is a manual "renew" action when the customer pays again.
- Gateway wording in `services/sms.py` and the automatic `send_receipt_email` task (see A.5 for what replaces it).
- Related tests in `apps/payments/tests/` (`test_services.py`, `test_tasks.py`, much of `test_api.py` and `test_models.py`) and the gateway/MoMo parts of `seed_data.py`.

**Rework the `PaymentGateway` enum** (`core/constants.py`) into a plain **payment method** list used only for labelling how money was received:
`CASH`, `MTN_MOMO`, `ORANGE_MONEY`, `BANK_TRANSFER`, `OTHER`. Remove `STRIPE`, `PAYPAL`, and `CREDIT` (credit is not a payment method, it is a payment state, see A.3). Rename it to `PaymentMethodType`; rename `Payment.gateway` to `Payment.method` (the old `Payment.method` FK to `PaymentMethod` goes away). A data migration must map old rows: `STRIPE`/`PAYPAL` to `OTHER`, `CREDIT` to a credit entry (see A.3).

**Keep and rework** the `Payment` model as a manual ledger of money received. Remove `gateway_reference`, `failure_reason`, and the `PENDING`/`FAILED` statuses, because a manually recorded payment already happened. Fields to have:

| Field | Notes |
|-------|-------|
| `order` (FK) | Subscriptions can also be paid for (see A.4) |
| `amount` | Amount received. Must be greater than 0 |
| `method` | `PaymentMethodType` |
| `reference` | Optional: MoMo transaction ID, transfer reference, receipt number |
| `received_by` | Staff user who took the money |
| `received_at` | When the money was received (default now, editable for back-dating) |
| `payer_name` / `payer_phone` | Optional, for when someone else pays |
| `notes` | Free text |
| `tendered_amount` / `change_given` | Cash only |
| `voided_at`, `voided_by`, `void_reason` | A recorded payment is never hard-deleted; a mistake is **voided** and logged |

Keep `Refund` but make it manual too (see A.6). Keep `Invoice` (see A.5).

### A.2 Income is recognised when the order is placed

Today every revenue figure comes from succeeded `Payment` rows (`FinanceSummaryView`, `RevenueAnalyticsView` in `apps/finance/api/views/analytics.py`, the daily summary task in `apps/finance/tasks.py`, and the admin dashboard KPIs). That makes unpaid and credit orders invisible as income. Change it:

- **Income (revenue) = `Order.total_amount` of every order that is not cancelled, counted on the order's `created_at` date.** Use `created_at`, not delivery date or payment date. Subtotal, discount and delivery fee should be reportable separately.
- **Cancelling an order removes its income** (and refunded amounts are reported separately, see A.6). Soft-deleted orders are excluded.
- **Edits that change the total** (item added, weight corrected at intake, discount applied) change income for that order automatically, because income is computed from the order, not stored as a separate entry. If you prefer a stored ledger, create an `IncomeEntry`/journal row on order creation and adjusting rows on edits. Computing from orders is simpler and cannot drift.
- **Subscription-covered orders** have `total_amount` of 0 after the plan discount. Count plan income separately: record a subscription's income when the subscription is created/sold (its plan price), dated by that date. Decision needed from you: whether to treat a plan as income on the sale date (simple) or spread over its 30 days.
- **Walk-in quick sales** are income on creation, like any order.
- **Separate "cash collected" from "income".** Keep a *cash received* figure from `Payment` rows (by `received_at`), and add *outstanding receivables* = income booked minus payments received. The dashboard and analytics should show all three: **Income booked**, **Cash received**, **Outstanding (unpaid)**.
- **Profit** = income booked minus expenses and payroll (and optionally minus cost of supplies from inventory). Update `FinanceSummaryView` accordingly, and rename keys so the frontend does not label booked income as "payments".
- Update: `FinanceSummaryView`, `RevenueAnalyticsView` (group orders by `created_at`, add a cash-received series), the `daily_summary` task, the admin dashboard and Analytics page, seed data, and the credit-account logic below.
- **Loyalty points** currently depend on `DELIVERED` and ignore payment. Decide whether points are earned on delivery regardless of payment (matches "income at order time"), or only once the order is fully paid. Recommended: award on delivered **and** paid, because points are a cost.
- **Customer credit (`CreditAccount`)** is no longer a separate payment method. Every unpaid order is effectively on credit. Either (a) keep the credit account as a customer-level ledger fed automatically by `UNPAID`/`PARTIALLY_PAID` orders, or (b) drop `CreditAccount` and compute a customer's outstanding balance from their orders. Option (b) removes duplicate bookkeeping (today a quick sale writes both an order and a `CreditTransaction`) and is recommended. If you keep credit limits, enforce them when an order is placed.

### A.3 Order payment states

Add to `Order` (`apps/orders/models/order.py`):

| Field | Notes |
|-------|-------|
| `payment_status` | Stored, indexed, kept in sync by one service function (below) |
| `amount_paid` | Sum of non-voided payments minus processed refunds |
| `balance_due` | Property: `total_amount - amount_paid` (never negative in display) |
| `paid_at` | When it became fully paid (null otherwise) |
| `payment_due_date` | Optional, for credit customers |

**States (`PaymentStatus`, replace the current gateway-oriented list `PENDING/SUCCEEDED/FAILED/REFUNDED/PARTIALLY_REFUNDED`):**

| State | Meaning |
|-------|---------|
| `UNPAID` | Nothing received yet (this is the state of every new order) |
| `PARTIALLY_PAID` | Some money received, balance still due |
| `PAID` | `amount_paid >= total_amount` |
| `OVERPAID` | More received than owed; needs a refund or credit note |
| `PARTIALLY_REFUNDED` | Some of the paid amount has been given back |
| `REFUNDED` | All of the paid amount has been given back |
| `WAIVED` | Written off by a manager (gift, goodwill, bad debt), with reason and who approved |
| `NO_CHARGE` | Total is 0 (covered by a subscription or 100% promo); needs no payment |
| `VOID` | Order cancelled; any money received must be refunded or cleared first |

Rules:
- Put the calculation in one place, e.g. `services/order_payments.py::recompute_payment_status(order)`. Call it whenever a payment is recorded, voided, or refunded, whenever the order total changes (items edited, discount changed), and on cancellation. Never set `payment_status` by hand elsewhere.
- Every transition writes an `OrderPaymentHistory`/audit row (who, when, from, to, amount, reason).
- A new order starts as `UNPAID` (or `NO_CHARGE`), whether made online or by quick sale. Quick sale with "paid now" creates the order and the `Payment` in one transaction, so it ends as `PAID`; "pay later" leaves it `UNPAID`.
- Block or warn on handing over (`OUT_FOR_DELIVERY` / `DELIVERED`) an order that is `UNPAID`/`PARTIALLY_PAID`, with a manager-override that is logged. Make this a setting.
- Add a `payment_status` filter, and a `balance_due` field, to the orders list API, along with `?payment_status=UNPAID`, `?overdue=true`, and customer/date filters.
- Invoice status follows the order: derive `Invoice.amount_paid` and `is_settled` from the same function.

**Endpoints (staff):**
- `POST /orders/{id}/payments/` record a payment (amount, method, reference, received_at, notes). Permission `payments.record`. Reject amount <= 0; reject amounts above the balance unless `allow_overpayment` is sent (then state `OVERPAID`).
- `POST /payments/{id}/void/` with reason (manager permission).
- `POST /orders/{id}/waive/` (owner or manager permission, reason required).
- `GET /orders/{id}/payments/` list, `GET /payments/` filter by method, date, staff, order, customer.
- `POST /orders/{id}/mark-paid/` shortcut: records one payment for the full balance with the chosen method.
- Customers can read (not write) their order's payment state, balance, and payments list.

### A.4 Subscriptions without a gateway

- Remove customer self-checkout. A customer can still **request** a plan from the app, which creates a `PENDING` subscription.
- Staff records the payment (`POST /subscriptions/{id}/payments/`), which activates the plan: `ACTIVE`, 30-day `start_date`/`end_date`, `kg_remaining` set from the plan. Reuse `activate_subscription` logic, triggered by staff action instead of a webhook-driven signal.
- Add `price_paid`, `payment_status` and `paid_at` to `Subscription`, with the same state names where they apply (`UNPAID`, `PAID`, `REFUNDED`).
- Add staff endpoints: list all subscriptions (the current views filter by `request.user`), activate, renew, pause, resume, cancel, adjust kilos. `expire_subscriptions` stays (it needs to be scheduled).
- `Payment` needs either an optional `subscription` FK (keep the existing "exactly one of order or subscription" check) or a separate `SubscriptionPayment`. Keeping the FK is simplest.

### A.5 Invoices, receipts and notifications

- Keep `Invoice`, create it **when the order is placed** (not on first successful payment as `apps/payments/signals.py` does today). It then shows total, paid so far, balance due and status.
- Generate a PDF invoice and a printable **receipt for each recorded payment** (shop details, payment method, amount, reference, balance remaining).
- Replace `send_receipt_email` (which fires on a gateway success) with an optional "send receipt" action after a staff member records a payment: SMS/WhatsApp/email according to `NotificationPreference`. Make auto-send a setting.
- Add notifications: payment recorded, payment reminder for unpaid orders, overdue balance.
- Add a staff notification when a customer places an order that needs payment on delivery, if useful.

### A.6 Refunds, credit and reconciliation, all manual

- Refund = staff records money **given back** (cash, MoMo, transfer) or converts it to a credit note / balance on the customer's account. Fields: `amount`, `method`, `reference`, `reason`, `refunded_by`, `refunded_at`. No gateway call.
- Validate that total refunds on an order never exceed the amount paid. Recompute payment state after each refund.
- Keep the approval flow (pending, approved, rejected, processed) only if you want manager sign-off; otherwise allow a manager to record a refund in one step. Either way, show who approved and who paid it out.
- **Daily cash reconciliation** becomes more important: opening float, cash received by method for the day (from `Payment`), refunds paid, expenses paid in cash, counted cash, variance, closed by. Add a `CashRegisterDay`/`CashClose` model and an end-of-day screen. Show cash, MoMo, Orange Money and transfer totals separately so they can be matched against the phone and bank statements.
- Add a "payments received by staff member" report, to catch mistakes and misuse.
- Every payment, void, waive and refund must write to the audit log (`StaffActivityLog`).

### A.7 Frontend: remove integrations

**Customer area:**
- `app/(customer)/book/confirm/page.tsx`: remove the gateway/mobile-money selector, saved method picker, and the "pay now" initiation. After booking, show the order with its payment state and "Pay on pickup or delivery / pay at the shop" instructions plus the shop's MoMo/Orange numbers if you want customers to pay that way and then tell you.
- `app/(customer)/settings/payments/page.tsx`: delete (saved payment methods no longer exist). Remove the link from settings and from `CustomerNav` if it points to it.
- `app/(customer)/payments/page.tsx`: turn into a read-only **payment history and balances** page (what was paid, when, how, what is still owed per order).
- `app/(customer)/subscription/page.tsx`: remove checkout, gateway selection and recurring billing choices. Show plan, status, kilos left, expiry, "Request / renew plan", and "payment pending, pay at the shop" when unpaid.
- `src/lib/api/payments.ts`: delete `listPaymentMethods`, `addPaymentMethod`, `removePaymentMethod`, `setDefaultPaymentMethod`, `initiatePayment`, `startSubscriptionCheckout`; add the new record/void/waive calls for staff.
- `src/types/payment.ts`, `src/types/enums.ts`, `src/types/order.ts`: remove `PaymentMethod`, `AddPaymentMethodInput`, `InitiatePaymentInput`, `SubscriptionGateway`, the gateway enum values and `ussd_code`; add the new `PaymentStatus` and `PaymentMethodType`.
- Remove `@stripe/react-stripe-js` from `package.json`, and gateway wording from marketing/pricing pages (`PricingSections.tsx`, `PricingContent.tsx`, `pricing-data.ts`): replace "pay by card/Mobile Money online" copy with "pay in person" copy. Also check `BubbleOverlay.tsx`, which matched the gateway/stripe search.
- Admin quick-sale page: replace gateway choices with method (Cash, MTN MoMo, Orange Money, Bank transfer), plus an amount-received field (supports partial payment and change due) and a clear "Pay later / leave unpaid" option.

### A.8 Frontend: make payment state clearly visible

Create one shared component, e.g. `PaymentStatusBadge` (in `src/components/ui`), and one `PaymentSummary` block, used everywhere so the state always looks the same. Colour plus text plus icon (never colour alone):

| State | Suggested look |
|-------|----------------|
| `UNPAID` | Red badge "Unpaid" |
| `PARTIALLY_PAID` | Amber badge "Partially paid", showing "X of Y paid" |
| `PAID` | Green badge "Paid" |
| `OVERPAID` | Purple/blue badge "Overpaid", with amount to return |
| `PARTIALLY_REFUNDED` / `REFUNDED` | Grey/blue badge |
| `WAIVED` | Grey badge "Waived" |
| `NO_CHARGE` | Neutral badge "No charge (plan)" |
| `VOID` | Struck-through grey |

Where it must appear:
- **Admin orders list:** a Payment column (badge plus balance due), a payment-status filter, "Unpaid orders" quick tab, sort by balance due, and a row highlight for overdue.
- **Admin order detail:** a prominent payment card at the top (status badge, total, paid, balance due, progress bar), the list of recorded payments (method, amount, who, when, reference, void button), and big **Record payment**, **Mark fully paid**, **Refund** and **Waive** buttons.
- **Quick sale:** payment state of the sale shown on the confirmation screen, with a printable receipt.
- **Admin dashboard:** KPI tiles for Income booked, Cash received, Outstanding to collect, and a list of unpaid/overdue orders (oldest first).
- **Customer detail and customers list:** outstanding balance, unpaid order count, and a "record payment" shortcut (this replaces the separate "Customer credit" screens if you go with option (b) in A.2).
- **Payments page (admin):** becomes the ledger of recorded payments with filters (method, staff, date) and totals by method; a "needs payment" tab for unpaid orders.
- **Invoices list/detail:** status (Unpaid, Partly paid, Paid) and balance due.
- **Customer orders list and order detail:** same badge, balance and "how to pay" hint.
- **Dashboard and analytics:** relabel "Revenue" to "Income booked" and add the "Cash received" and "Outstanding" figures. Make clear on screen which is which.
- Add a legend/tooltips so staff know what each state means, and a confirmation dialog on void, waive and refund.
- Update `orderStatusTone`-style helpers with a `paymentStatusTone` helper, and keep `StatusBadge` for order status so the two never get confused (show them side by side but visually distinct).

### A.9 Migration plan and risks

1. Add the new fields and states first (`Order.payment_status`, `amount_paid`, new `Payment` fields) and backfill existing orders from their `Payment` rows (succeeded payments count as received; `PENDING`/`FAILED` rows are dropped or archived).
2. Convert old `CreditTransaction` data: charges become unpaid balance on their orders; repayments become `Payment` rows. Do this before dropping credit tables, or keep them read-only for history.
3. Backfill invoices for orders that do not have one.
4. Switch analytics to the new income definition **and tell the owner**: past months will show different numbers (income by order date instead of payment date).
5. Remove gateway code, settings and dependencies last, after the new manual flow works.
6. Existing subscriptions with `external_subscription_id` (Stripe/PayPal) must be cancelled on the provider side or they will keep billing customers with no way for the system to know. Handle these manually before shutting the webhooks down.
7. Rotate or delete the removed API keys and webhook secrets from every environment.

---

## 1. Inventory

### 1.1 Missing fields on `InventoryItem` (`apps/inventory/models.py`)

Today an item only has `name, category, unit, quantity, low_stock_threshold, notes`.

| Field | Type | Why |
|-------|------|-----|
| `unit_cost` | Decimal(10,2) | Initial/purchase price per unit. This is the "initial price" you mentioned |
| `last_purchase_cost` | Decimal(10,2) | Last price paid, updated on each restock |
| `average_cost` | Decimal(10,2) | Weighted average cost, recalculated on each restock, used for valuation and cost-of-supplies reporting |
| `sku` / `barcode` | CharField, unique, nullable | Identify items, avoid duplicates, support scanning later |
| `supplier` | FK to a new `Supplier` | Who it is bought from |
| `brand` | CharField | Omo, Ariel and Downy are currently only in the item name |
| `pack_size` / `pack_unit` | Decimal + unit | e.g. "5 kg bag". Needed so restocking by bag converts to kg |
| `reorder_quantity` | Decimal | Suggested amount to buy when the item is low |
| `storage_location` | CharField | Shelf, store room, machine area |
| `expiry_tracking` + `expires_on` | Boolean + Date | Detergents and softeners do expire. Alert before expiry |
| `is_active` | Boolean | Archive items instead of deleting. Today `DELETE` on an item cascades and destroys all its transaction history |
| `image` | ImageField (optional) | Help staff find the right product |

Also:
- Switch deletion to soft-delete (the project already has `SoftDeleteModel`). Right now `InventoryTransaction.item` uses `on_delete=CASCADE`, so deleting an item erases its audit trail.
- Add a `Meta` constraint so `quantity` cannot go negative, or at least validate it. Today a USAGE entry larger than stock silently makes `quantity` negative.
- `unit` has only `L, KG, PCS, ML`. Add `G`, `PACK`, `BOX`, `ROLL`, and define conversions (for example mL to L).
- `InventoryCategory` is missing common laundry items: `STAIN_REMOVER`, `BLEACH`, `HANGERS`, `BAGS`, `MACHINE_PARTS`, `CLEANING`. "Stain Remover Spray" is currently seeded as `DETERGENT`.

### 1.2 Missing fields on `InventoryTransaction`

| Field | Why |
|-------|-----|
| `unit_cost` | Price paid per unit on a RESTOCK, so cost history is kept per delivery |
| `total_cost` | Computed or stored total for the restock |
| `supplier` (FK) | Who delivered it |
| `reference` / `invoice_number` | Supplier invoice or delivery note number |
| `quantity_before` / `quantity_after` | Snapshot for audit; makes stocktake disputes easy to trace |
| `order` (FK, nullable) | The order the usage was for |
| `machine` (FK, nullable) | Which machine consumed it (see 1.5) |
| `batch` / `load_ref` | Which wash cycle consumed it |
| `expense` (FK, nullable) | Link to the `Expense` row created for the purchase |
| `ChangeType` additions | `WASTE` (spilled or expired), `DAMAGED`, `RETURN_TO_SUPPLIER`, `TRANSFER`, `OPENING_STOCK` |

### 1.3 Recording supply usage (the detergent example)

Today usage is only a manual `POST /inventory/items/{id}/adjust/` with a negative number and a free-text reason. Nothing else in the system consumes stock. Needed:

1. **Usage standards per service** (new model, e.g. `ServiceConsumption`): for each service type (e.g. `LAVAGE_ESSORAGE`, `LAVAGE_SECHAGE`) and each inventory item, store how much is used per kg or per load. Example: Lavage et Essorage uses 30 mL liquid detergent and 20 mL softener per kg.
2. **Automatic deduction when an order moves to `IN_PROGRESS`**: create `USAGE` transactions based on the order's items, linked to the order. Use an idempotency guard so repeated status changes don't double-deduct, and reverse it if the order is cancelled before washing.
3. **Manual "log usage" endpoint** built for staff, not a generic adjust: `POST /inventory/usage/` accepting several items at once (e.g. "3 loads: 150 mL detergent, 100 mL softener, 6 bags") with the order or machine and the staff member recorded.
4. **Batch / wash-load log** (new model `WashLoad`): date, machine, staff, linked orders, supplies used. This is the natural place to record usage for a load that contains several customers' orders.
5. **Variance reporting**: expected usage (from the standards and orders washed) versus actual stock movement, so over-use and theft show up.
6. Quick Sale (`StaffQuickSaleSerializer.create`) creates and confirms orders but never touches inventory. It needs the same hook.

### 1.4 Backend inventory functionality that is missing

- `GET /inventory/items/` has only `category` and `search` filters. Add `low_stock`, `supplier`, `is_active`, `ordering`, `expiring_before`.
- `GET /inventory/transactions/` (global ledger across all items). Only a per-item list exists today. Add filters by type, date range, staff member, order.
- Stocktake workflow: start a count, enter counted quantities per item, review variances, approve to post `ADJUSTMENT` rows. Today a stocktake correction is a single manual adjustment.
- Purchase orders / restock requests: draft, ordered, received. Receiving should create RESTOCK transactions, update costs and optionally create an `Expense`.
- Supplier model and endpoints (name, phone, address, products, payment terms, notes).
- Valuation report: total stock value (quantity × average cost) by category.
- Consumption report: usage per item per period, cost of supplies per kg washed and per order.
- Low-stock alerts currently notify only on `post_save` of a transaction and are de-duplicated by an unread notification with the same title. Add: alert again when stock is restocked above the threshold and later drops, a daily low-stock digest, and optional SMS or WhatsApp to the manager.
- Race condition in `apps/inventory/signals.py`: quantity is updated with `F()` and then re-read. Wrap the transaction create and the quantity update in one atomic block and validate no negative stock under lock (`select_for_update`).
- `InventoryAdjustSerializer`: `ADJUSTMENT` has no sign validation. Define whether it is a delta or an absolute counted value (an absolute "counted quantity" is much more usable for stocktakes).
- `InventoryTransactionSerializer` returns `created_by` as a plain string. Return `{id, name}`.
- Seed data (`seed_data.py`) creates inventory items without costs, suppliers or usage standards. Update it once the new fields exist.

### 1.5 Machines and equipment (new)

There is a `EQUIPMENT` category but no concept of machines. Add a `Machine` model (name, type washer/dryer/press, capacity kg, status, installed date, last service date, next service due) and a `MaintenanceLog` (date, work done, cost, technician, parts used from inventory). Link maintenance cost to `Expense` (category `MAINTENANCE`). Add per-machine usage counts and downtime.

### 1.6 Admin panel: inventory

Files: `app/(admin)/admin/inventory/page.tsx`, `inventory/[id]/page.tsx`, `src/components/inventory/*`, `src/lib/api/inventory.ts`, `src/types/inventory.ts`.

- `InventoryItemForm` has no cost, supplier, SKU, pack size, expiry or location fields. Add them once the model has them.
- List page shows only name, category, quantity and status. Add unit cost, stock value, supplier, last restocked and a "reorder" indicator.
- Add a "Log usage" quick action (multi-item) on the list page, not just the per-item adjust form.
- Add a global transactions/ledger page with filters and CSV export.
- Add pages for Suppliers, Purchase orders / restocks, Stocktake, Usage standards (per service), Wash loads and Machines.
- Add an inventory valuation and consumption report (could live on Analytics).
- The list filters search client-side on the loaded page only. Move search, category and low-stock filters to the server and paginate.
- Item detail: show cost history chart, usage trend, average daily usage and "days of stock left".
- Replace hard delete with Archive.
- `InventoryChangeType` and `InventoryItem` types in `src/types/inventory.ts` need to match every new field.
- Permission gap: attendants only have `inventory.view`, so they cannot log the daily usage they do. Add an `inventory.log_usage` permission (attendant can log usage, manager can restock and adjust).

---

## 2. Orders

### 2.1 Missing fields

`Order` (`apps/orders/models/order.py`):

| Field | Why |
|-------|-----|
| `source` (`ONLINE`, `WALK_IN`, `PHONE`, `STAFF`) | Quick-sale orders are currently indistinguishable except by `pickup_address == "In-store"` |
| `created_by` (FK staff, nullable) | Who took a walk-in order |
| `assigned_to` (FK staff, nullable) | Who is processing it |
| `driver` (FK staff, nullable) | The `assign_driver` task is a placeholder that appends text to `notes` |
| `payment_status` (`UNPAID`, `PARTIAL`, `PAID`, `REFUNDED`) | Needs computing or storing; today the list has no payment information |
| `amount_paid` / `balance_due` | Same |
| `paid_with_credit` or link to credit transaction | Make credit sales explicit |
| `cancelled_at`, `cancelled_by`, `cancel_reason` | Cancellation currently records nothing |
| `ready_at`, `delivered_at` | Turnaround-time reporting. History rows exist but are awkward to query |
| `expected_ready_at` | Promise date for the customer |
| `tag_number` / `ticket_number` | Physical ticket on the garment bag. Customers refer to this, not the database id |
| `internal_notes` | Staff-only notes, separate from customer-visible `notes` |
| `priority` / `is_express` | Express service, surcharge |
| `pieces_count` / `weight_kg_total` | Stored totals for quick display and reporting |

`OrderItem`:

| Field | Why |
|-------|-----|
| `status` | Per-item state (washed, pressed, packed) |
| `condition_notes` / `stain_notes` | Pre-existing damage; protects the business in disputes |
| `photo` | Photo at intake |
| `service_type` `max_length=20` | Check it still fits all choices if more services are added |
| `weight_kg` is required and has `MinValueValidator(0.1)` | For per-piece items weight is meaningless to the customer; make it optional for per-piece service types |

`PickupDeliverySchedule`:
- Missing `driver` FK, `pickup_completed_at`, `delivery_completed_at`, `proof_of_delivery` (photo or signature), `failed_reason`, `contact_phone`, `address_override`.
- `driver_notes` exists but no driver is attached.

`OrderStatusHistory`: add `ip`/`source` if needed. It is fine otherwise.

### 2.2 Missing backend behaviour

- **No transition rules (P0).** `OrderStatusUpdateView` (`apps/orders/api/views/order.py`) accepts any value in `OrderStatus` from any current status (`DELIVERED` back to `PENDING`, `CANCELLED` back to `IN_PROGRESS`, etc.). `src/lib/api/orders.ts` documents `services.order_flow.ALLOWED_TRANSITIONS`, but no such module exists. Create it and enforce it, with `CANCELLED` and `DELIVERED` as terminal states.
- **Cancellation side effects (P0).** `OrderCancelView` only sets `status=CANCELLED`. It does not:
  - restore `Subscription.kg_remaining` (the order consumed it in `OrderCreateSerializer.create`),
  - remove or flag the `PromoUsage` so the customer's per-user limit and the code's `max_uses` are freed,
  - reverse a credit `CHARGE` created by a quick sale,
  - start a refund for a succeeded payment,
  - reverse inventory usage deducted for the order.
  Staff cancelling via the status endpoint skip even this. Put cancellation in one service function used by both routes.
- **Loyalty points are never reversed** if a delivered order is later refunded or cancelled.
- **Loyalty is awarded on delivery regardless of payment.** The docstring says "DELIVERED and paid" but `award_points_for_order` checks neither payment nor credit status. Credit-tab orders earn points before being paid.
- **Orders are not blocked from going `DELIVERED` while unpaid** (or at least warned).
- **Server-side filtering missing on `GET /orders/`.** There are no filters for status, date range, customer, payment status, source, assignee or search, and no ordering parameter. The admin panel works around this by filtering only the 20 rows on the current page.
- **Staff editing of an order is minimal.** `PATCH /orders/{id}/` can change only addresses and notes. Staff cannot add, remove or edit items, correct a weight after weighing, apply a discount, change the delivery fee or reassign the customer. Add `POST /orders/{id}/items/`, `PATCH/DELETE /orders/{id}/items/{item_id}/` with automatic `recalculate_total()` and an audit entry.
- **Weighing at intake.** Online orders use customer-estimated weights. Add a "confirm actual weight" step that reprices the order and notifies the customer if the total changes.
- **`OrderItem.save()` recomputes `subtotal = unit_price * quantity`, but `Order.recalculate_total()` is not triggered** when items are saved or deleted individually. Totals can drift.
- **`Order.total_amount` has no non-negative guarantee.** A fixed discount plus fee logic should be clamped.
- **Delivery fee is a flat 1500 XAF for every order** (`pricing.calculate_delivery_fee`). Quick-sale takes the fee as free input. Support walk-in orders with no delivery, zone-based fees and free-delivery thresholds, and make prices configurable (see section 8).
- **`assign_driver` is a stub** that appends text to `notes`. Build real driver assignment.
- **Status SMS only covers `CONFIRMED`, `READY`, `OUT_FOR_DELIVERY`.** Add `DELIVERED` (thank you plus loyalty points), `CANCELLED`, payment received and pickup reminders. Respect `NotificationPreference` flags (SMS, WhatsApp, push, email); `send_status_update` currently sends SMS regardless of preferences.
- **Schedule permissions use `request.user.is_staff`** instead of `HasStaffPermission`, so an inactive staff profile, or a role without `orders.manage`, still gets staff access to every schedule (`apps/orders/api/views/schedule.py`).
- No endpoint lists schedules (for example "all pickups today") or filters by date, slot or driver.
- No capacity limits per time slot.
- The Order `pickup_address` and `delivery_address` are free text. Add saved addresses with a map pin or landmark, which matters for riders in Bamenda.
- Soft-deleted orders (`SoftDeleteModel`) are never exposed or restorable by admins.

### 2.3 Admin panel: orders

Files: `app/(admin)/admin/orders/page.tsx`, `orders/[id]/page.tsx`, `quick-sale/page.tsx`.

- List page: server-side search, status, date, payment status and source filters; sorting and pagination across all orders, not just the loaded page. Its own header text says "staff see the same GET /orders/ list customers see".
- Show payment status, amount paid and balance due, source, assignee and driver columns.
- Order detail currently offers only a status dropdown, with all 7 statuses available regardless of current state. Replace it with next-valid-action buttons (Confirm, Start, Mark ready, Out for delivery, Delivered, Cancel with reason).
- Order detail is missing: customer contact and link, payment list and "record payment" button, invoice link, refund button, schedule (pickup and delivery) with edit, assigned staff and driver, internal notes, print receipt or ticket, applied promo or subscription indicator.
- Edit order items, weights and fees (staff).
- Print or download a ticket/label and customer receipt (thermal-printer friendly).
- Bulk actions: select several orders and move to Ready or Out for delivery, assign a driver.
- Today board / kanban view by status, plus a "pickups and deliveries today" view.
- Quick-sale page (`quick-sale/page.tsx`): no inventory usage, no discount or promo code field, no served-by display, no receipt printing, no customer lookup autocomplete (phone is free text), no partial payment, no amount tendered and change due for cash.

---

## 3. Payments, invoices and refunds

> **Superseded in part by section A.** Gateways are being removed and payments recorded manually. Skip anything below about gateway refunds, webhooks, gateway fees, `gateway_reference`, pending-payment timeouts, `PaymentMethod` and stuck `PENDING` payments. The rest (staff recording payments, refund side effects, invoice PDFs, filters, subscriptions admin, cash reconciliation) still applies, as reshaped in section A.

### 3.1 Missing fields

- `Payment`: `received_by` (staff who took cash), `tendered_amount` and `change_given` (cash), `notes`, `refunded_amount` (running total; today status is just PARTIALLY_REFUNDED with no amount), `fee_amount` (gateway fees, for true profit), `metadata`/`raw_response` (gateway payload for support).
- `Invoice`: `subtotal`, `discount`, `delivery_fee`, `tax`, `due_date`, `status` (DRAFT, ISSUED, PAID, VOID), `customer snapshot` (name, phone, address at time of issue), `notes`. At the moment it holds only `amount_due` and `amount_paid`.
- `Refund`: `gateway_reference`, `method` (refund to the same gateway, cash, or store credit), `requested_by`, `rejection_reason`, `restock/return flags`. `processed_by` is set when approved/rejected, then `PROCESSED` does not record who or when it was actually paid out (`RefundProcessView` sets neither `processed_at` nor `processed_by`).
- `Subscription`: `price_paid`, `last_renewed_at`, `next_billing_date`, `paused_at`, `cancelled_at`, `cancellation_reason`, `auto_renew` clarity.

### 3.2 Missing backend behaviour

- **Invoice PDFs are never generated (P1).** `Invoice.pdf_file` exists and the admin invoice page has a button, but nothing creates a PDF. Add generation (and a branded receipt) on payment.
- **Invoice numbers use `INV-{order.pk}`** which is fine for now but cannot support credit notes or yearly resets. Add a sequence and credit-note numbering.
- **Staff cannot create payments.** `POST /payments/` is `PaymentInitiateSerializer` for customers paying online. There is no staff endpoint to record "customer paid 5 000 XAF cash / MoMo at the counter for order 42", including partial payments and overpayment handling. Add `POST /orders/{id}/record-payment/` (permission `payments.record`).
- **Refunds only change status (P0).**
  - `RefundProcessView` does not call any gateway refund (Stripe, PayPal, CamPay), so "processed" can be recorded when no money moved.
  - Refund amount is not validated against `payment.amount` minus earlier refunds. Several partial refunds can exceed the payment.
  - Refund queryset for customers filters `payment__order__user` and so excludes subscription payments.
  - Processing does not update the `Invoice.amount_paid`, restore credit-account balance, reverse loyalty points, restore subscription kilos or update order payment status.
  - No notification to the customer on approve, reject or process.
- **Refund approvals need `refunds.manage` but it is not in `ROLE_PERMISSIONS["MANAGER"]`.** Only the owner has it. Decide whether managers should have it.
- **Payment status reconciliation:** a payment stuck in `PENDING` (customer abandoned the MoMo prompt) has no timeout/expiry, no "retry", no "mark failed" action.
- **Webhooks** are present, but no admin screen shows webhook events or failures. Add a `WebhookEvent` log model for replay and debugging.
- **No admin view of subscriptions.** `SubscriptionListCreateView` and detail views filter by `user=request.user`, so staff cannot see who is subscribed, who is about to expire, or adjust kilos.
- `PaymentMethod` listing for staff, and the ability to add a method on behalf of a customer, are missing.
- **Cash drawer / daily reconciliation:** no model for opening float, cash in, cash out, end-of-day count and variance. This is essential for a counter business.
- **Payment list filters:** no filters for gateway, status, date, customer, order. No export.

### 3.3 Admin panel: payments

Files: `app/(admin)/admin/payments/page.tsx`, `payments/[id]`, `payments/invoices/*`, `payments/refunds/page.tsx`.

- Refunds page is explicitly view-only: the text says there is no confirmed approve/reject/process control. The backend already has `POST /refunds/{id}/approve|reject|process/`. Add buttons, a reason field and confirmation dialogs, plus an API client for them (`src/lib/api/payments.ts` has `listRefunds` and `requestRefund` only).
- Add "Create refund" from a payment or order page.
- Add "Record payment" for an order (cash, MoMo, other), with amount, method, reference and receipt.
- Invoice detail's download/print button has no working PDF behind it.
- Add filters (gateway, status, date range, search by customer or reference), totals row and CSV export on payments.
- Add a Subscriptions admin page: list, status, kilos remaining, expiry, pause, resume, cancel, adjust kilos and manually activate.
- Add a Cash register / end-of-day page.
- Add a failed/pending payments queue with retry and "mark failed" actions.

---

## 4. Customers, credit and loyalty

### 4.1 Missing fields

`CustomUser` / `UserProfile`:
- `notes` (staff-only customer notes: allergies to scents, preferences), `tags`, `source` (walk-in, online, referral), `referred_by`, `last_order_at`, `is_blocked` or `blacklist` with reason, `marketing_opt_in`, `whatsapp_number` if different from phone, `secondary_phone`, `gender` (optional), `default_pickup_address`.
- Walk-in customers are created by quick sale with an unusable password and `first_name="Walk-in"` when no name is given. Add an `is_walk_in` / `registered` flag and a way to merge a walk-in account with a later registered account by phone.

`CreditAccount`: `last_payment_at`, `due_date` or terms (e.g. 30 days), `is_frozen`, `notes`. `credit_limit` is stored but **never enforced** (the comment says "0 = no limit enforced", and no code checks the limit when charging).

`CreditTransaction`: `payment_method` for repayments, `receipt_number`, `balance_after`.

`LoyaltyAccount`: no `last_activity` or `points_expiry`. `LoyaltyTransaction.EXPIRE` type exists but no expiry job.

### 4.2 Missing backend behaviour

- **Credit limit enforcement:** reject credit sales and charges that would exceed `credit_limit`.
- **Credit aging and reminders:** no overdue report, no SMS reminders for outstanding balances.
- **Customer admin actions:** the customer endpoints are read-only (`ListAPIView` / `RetrieveAPIView`). Staff cannot create, edit, deactivate, add notes, merge duplicates or reset a customer's password.
- **Customer list filters:** only `search` and `ordering`. Add filters for tier, has-credit, last order date, city, active, and a `last_order_at` annotation. Lapsed-customer lists matter for the `LAPSED` campaign segment.
- **Loyalty rules and the stamp card have no API.** `LoyaltyRule` and `StampCardConfig` can only be edited via Django admin. Add owner/manager endpoints.
- **Loyalty tier thresholds are hard-coded** in `services/loyalty.py` (`TIER_THRESHOLDS`). Move to configurable settings.
- **Tier benefits are not defined.** There is no discount, priority or bonus for Silver and Gold.
- **Points expiry** (`EXPIRE` transaction type) and **manual adjustments** (`ADJUST`) have no endpoint or job.
- **`DiscountCampaign` is never applied.** It has segment, value and dates, but nothing in pricing or order creation reads it, and nothing sends it to the segment. Either apply campaigns automatically at checkout or notify the segment. Respect `promo_opt_in`.
- **Promo codes:** no per-service restriction, no first-order-only flag, no stacking rules, no usage report endpoint.- **Promo and subscription are mutually exclusive** in `OrderCreateSerializer` (promo takes precedence and silently skips the subscription). Decide the intended behaviour and tell the customer.

### 4.3 Admin panel: customers, credit, loyalty, discounts

Files: `customers/page.tsx`, `customers/[id]/page.tsx`, `finance/credit/*`, `discounts/*`.

- Customers page: add filters (tier, owes money, last order), customer create/edit form, notes, block/unblock, "new order for this customer" and "message this customer" shortcuts.
- Customer detail shows only the 10 most recent orders and credit transactions. Add full order history, payments, subscriptions, loyalty transaction history, chat history and notifications.
- Add manual loyalty adjustment (add or deduct points with reason).
- Add a Loyalty settings page: rules, tier thresholds, stamp-card configuration.
- Credit page: show credit limit, edit limit, overdue ageing, send reminder, print statement.
- Discounts: show campaign and promo performance (times used, revenue, total discount given), duplicate a promo, bulk-generate codes, and apply or send a campaign to its segment. `discounts/new/page.tsx` is only a 27-line shell.

---

## 5. Finance, payroll and reporting

### 5.1 Missing fields

`Expense`: `title/description`, `vendor/supplier` (FK), `payment_method`, `receipt` (image or PDF), `reference`, `is_recurring` + `recurrence`, `inventory_item`/`transaction` link, `approved_by`, `status` (e.g. pending approval). Category list lacks `TRANSPORT/FUEL`, `SALARIES` (handled separately), `MARKETING`, `TAXES/LICENSES`, `INTERNET/AIRTIME`, `INSURANCE`.

`PayrollEntry`: only `amount`. Add `base_salary`, `bonus`, `overtime`, `deductions`, `advance_recovered`, `net_amount`, `payment_method`, `payment_reference`. Add a salary-advance model. `employee` is a user FK; add `salary` and `pay_frequency` to `StaffProfile`.

`StaffProfile`: `phone` is on the user, but missing: `hire_date` (only `joined_at` as an auto timestamp), `base_salary`, `national_id`, `emergency_contact`, `address`, `photo`, `notes`, `employment_status`.

### 5.2 Missing backend behaviour

- **Revenue definition changes (see section A.2): income is now booked from orders when placed, not from payments.** The point below describes the current behaviour and its other gaps.
- **Profit figures are incomplete.** `FinanceSummaryView` counts only succeeded `Payment` rows as revenue. Credit sales that are unpaid, and credit repayments, are not treated as revenue or receivables. It does not subtract refunds. It does not include cost of supplies from inventory. It has no accrual versus cash view. The docstring promises "order volume, avg order value" but the response has only `payment_count` and `average_payment`.
- **Subscription revenue is mixed with order revenue**, with no way to split it.
- **Dates:** `_parse_date_range` uses `date.today()` and `date.fromisoformat` without error handling, so a bad date returns a 500 and server timezone can differ from Africa/Douala or Lagos.
- Missing analytics endpoints: revenue by service type, by payment gateway, top customers, new versus returning customers, orders by status and by day, average turnaround time, outstanding credit total, expense by category, inventory cost, profit and loss by month, subscription metrics (active, MRR, churn), peak hours and busiest slots.
- No export (CSV or Excel or PDF) for any report, payments, expenses or payroll.
- No payroll generation ("create entries for all active staff for this month"), no payslips, no mark-as-paid endpoint (only generic update), no advances or deductions.
- Payroll permission is `IsStaffManager` (owner only) while `finance.manage` also exists. Be consistent.
- Expenses: no recurring-expense generator, no receipt upload, no budget or monthly limit, and no delete protection or audit log.
- `apps/finance/tasks.py` sends a daily summary notification, but it is not clear a scheduler runs it (`CELERY_BEAT` is not configured and the project uses a custom Postgres jobs table). Confirm all periodic tasks (daily summary, subscription renewals, expiry, low-stock digest, credit reminders) are scheduled.
- `StaffActivityLog` is written only when code calls `log_activity`. Add calls for order status changes, refunds, payments, inventory changes, price or config changes and logins so the audit trail is actually populated, and add an admin-wide audit log endpoint.

### 5.3 Admin panel: analytics, expenses, payroll

Files: `analytics/page.tsx`, `payroll/page.tsx`, `src/components/finance/*`.

- Expenses exist only as a small section on the Analytics page with an add form (`AddExpenseForm`). There is no dedicated Expenses page, no edit or delete (API functions exist but no UI), no receipt upload, no category filter or search.
- Analytics shows only revenue/expense/profit and a revenue chart. Add the reports in 5.2, comparison to previous period, and export.
- Payroll page needs generation, deductions/bonus, mark paid, payslip and history per employee.
- Add an audit-log page.
- Dashboard (`app/(admin)/admin/page.tsx`) KPI "Orders in system" uses the count from page 1 of `listOrders(1)`. Replace it with real counts (orders today, in progress, ready for delivery, unpaid, late), low-stock count, pending refunds, outstanding credit and today's pickups/deliveries.

---

## 6. Staff and access control

- Roles are only `MANAGER` and `ATTENDANT` (plus superuser as owner). Add `DRIVER` (see assigned pickups/deliveries only), and consider `CASHIER`.
- Permissions are hard-coded in `apps/staff/permissions.py` and duplicated in `src/lib/admin-rbac.ts`. Keep them in sync via an endpoint, not two copies (the frontend already receives the permission list from the API; make that the single source).
- New permissions needed: `payments.record`, `inventory.log_usage`, `orders.cancel`, `orders.edit_items`, `loyalty.manage`, `reports.export`, `schedule.manage`, `suppliers.manage`, `audit.view`, `customers.manage`.
- Inconsistent checks: schedule views use `is_staff`; `PayrollEntry` views use `IsStaffManager`; `StaffDetailUpdateView.get_permissions` returns the same permission in both branches (dead branch).
- Staff cannot reset their own password in the admin panel, and there is no force-logout, session list or last-login display.
- Invites: no resend, no expiry job (the `EXPIRED` status exists, but nothing sets it), no SMS delivery confirmation.
- `StaffProfile` lacks the HR fields in 5.1.
- Add shift/attendance tracking (clock in and out) if payroll will be based on it.

---

## 7. Notifications and chat

- No admin broadcast: staff cannot send an announcement or promo to all or a segment of customers (SMS, WhatsApp, push), with `promo_opt_in` respected.
- No notification templates editable by admin (messages live in `services/sms.py`).
- `NotificationPreference.whatsapp_enabled` and `email_enabled` exist, but order status sending (`send_status_update`) uses SMS only.
- Staff notifications are limited to low stock and the daily summary. Add: new online order, payment failed, refund requested, overdue credit, subscription expiring, missed pickup.
- Chat: no canned replies, no assigning a chat to a staff member from the order, no link from a chat room to the customer's orders, no attachment moderation, no chat search, no typing or presence for staff, no after-hours auto reply.

---

## 8. Settings and configuration (missing entirely)

Prices, fees and business rules are hard-coded in `services/pricing.py` and `services/loyalty.py` (and flyer text in marketing components). Changing any price needs a code deploy. Add a settings layer (a `BusinessSettings` singleton or a `PriceItem` table) with an admin Settings page covering:

- Service price list (per-piece and per-kg prices, minimum charge) with effective dates and price history. Old orders keep their stored `unit_price`.
- Delivery fee rules (flat, by zone, free above X, none for walk-in).
- Subscription plans (price, kilos, period).
- Time slots and per-slot capacity, operating hours and closed days.
- Business info shown on receipts and invoices (name, address, phone, logo, tax number, footer text).
- Notification templates and which channels are on.
- Loyalty rules, tier thresholds and stamp-card config (see 4.2).
- Tax/VAT rate if applicable.
- `ServiceType` choices are hard-coded in `core/constants.py` and used in migrations; adding a service needs a migration. Consider moving services to a table.

---

## 9. Data integrity, security and code quality

- Several `DecimalField(decimal_places=0)` money fields cap at 10 digits (about 9.99 billion XAF). Fine for now, but `InventoryItem.quantity` and costs use `decimal_places=2`; be consistent when adding costs.
- Add `Meta.constraints` and validators: non-negative amounts, `end_date >= start_date`, `valid_until > valid_from` on promos, promo percentage between 0 and 100, loyalty `points_balance >= 0`.
- `OrderCreateSerializer.create` updates `subscription.kg_remaining` with an `F()` expression and then saves. Re-read before using the value, and prevent it going negative.
- `OrderItem.weight_kg` `max_digits=5, decimal_places=2` allows up to 999.99 kg; fine, but validate sensible maximums per item.
- `StaffQuickSaleSerializer` creates a real `CustomUser` for any phone, with `get_or_create` and no phone-format validation (the model validator only runs on `full_clean`). Validate with the same regex.
- `Order` cancellation by customers is allowed until `CONFIRMED`; define cut-off rules and whether a fee applies.
- Pagination `max_page_size = 100`; admin exports need a separate non-paginated or streaming route.
- Tests exist for users, orders and payments only. Add tests for inventory, finance, staff, discounts, chat and notifications, especially for the new rules above (transition validation, cancellation side effects, refunds, usage deduction).
- The uploaded archives include `__pycache__` folders and `.pyc` files; add `.gitignore` entries and remove them from the repo.
- `seed_data.py` is large (1,178 lines) and should be updated alongside each model change so demo data keeps working.
- Remove `Order.notes` being used for dispatch notes (`assign_driver`).
- Add an `idempotency` guard on webhook handling and on `activate_subscription`/`renew_subscription`.
- Add database indexes for new filter fields (order `payment_status`, `source`, `assigned_to`; transaction `item, created_at`).

---

## 10. Frontend admin panel: cross-cutting gaps

- **No Settings area** (see section 8) and **no Suppliers, Subscriptions, Schedule, Loyalty, Audit log, Expenses, Machines or Cash register pages.** The sidebar (`AdminNav.tsx`) has only: Overview, Quick sale, Orders, Payments, Chat inbox, Customers, Inventory, Customer credit, Discounts, Analytics, Staff & access, Payroll.
- **Lists filter and sort only the loaded page** (orders, inventory, customers). Move to server-side filter, sort and pagination with URL query params so filters survive refresh and can be shared.
- **No export** (CSV/Excel/PDF) on any table.
- **No print views** for tickets, receipts, invoices and statements.
- **No confirmation dialogs or undo** for destructive actions (delete item, cancel order, revoke invite).
- **No global search** (order #, phone, customer, invoice number).
- **No bulk actions** on any list.
- **No audit/history display** on entity detail pages.
- **No notification bell or live updates for staff** (new order, new chat, low stock) beyond what the chat socket provides.
- `ComingSoonState` exists as a component but is unused, so planned screens are not marked anywhere.
- Types in `src/types/*.ts` mirror backend serializers by hand. Generate them from the drf-spectacular schema (`/api/v1/schema/`) so new fields cannot be forgotten.
- Mobile/tablet layout for counter staff, loading and empty states and accessibility checks need a pass once new pages are added.

---

## 11. Suggested build order

0. **Payments rework (P0, do first, see section A):** add order payment states and manual payment recording; switch income to order-time; remove gateways, webhooks and `PaymentMethod`; update the frontend payment UI and badges; run the migration and backfill.
1. **Foundation (P0):** order status transition rules and one shared cancellation service; refund processing side effects; refunds approve/reject/process UI; staff "record payment"; credit-limit enforcement.
2. **Inventory v2 (P0/P1):** new item and transaction fields, supplier model, restock with cost, no-negative-stock rule, soft-delete; usage standards plus automatic deduction on `IN_PROGRESS`; usage-logging endpoint and UI; inventory ledger and valuation; expense link on purchases.
3. **Orders v2 (P1):** `source`, `created_by`, `assigned_to`, `driver`, `payment_status`, cancel fields, ticket number; server-side filters; staff item editing; schedules admin and driver role.
4. **Finance and reporting (P1):** richer analytics, expenses page, payroll generation, cash register, exports, invoice PDFs.
5. **Customers and loyalty (P1):** customer edit and notes, loyalty/stamp-card admin, campaign application, credit reminders, subscriptions admin.
6. **Settings and platform (P2):** editable prices and business info, notification templates, audit-log page, generated API types, test coverage.

Each step needs a migration, serializer/view/URL changes, seed-data updates, tests, and the matching `src/types`, `src/lib/api` and page changes on the frontend.

---

## Notes and assumptions

- This is based on reading the code in the two archives. I did not run the project or the tests.
- "Priority" labels are my judgment of the business impact. Reorder them to suit you.
- Some items (for example a cash drawer, shifts or machines) are optional depending on how much of the day-to-day you want in the system.
