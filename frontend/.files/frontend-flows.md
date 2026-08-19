# Frontend Flows & Interface Guide — Laundromat

> Reference for every page, component, and user flow in the Next.js app.
> Stack: Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Zustand · React Query · Socket.IO client

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Auth Flows](#2-auth-flows)
3. [Customer Flows](#3-customer-flows)
4. [Booking & Order Flows](#4-booking--order-flows)
5. [Payment Flows](#5-payment-flows)
6. [Discounts & Loyalty Flows](#6-discounts--loyalty-flows)
7. [Chat & Support Flows](#7-chat--support-flows)
8. [Notifications](#8-notifications)
9. [Admin Dashboard Flows](#9-admin-dashboard-flows)
10. [Shared Components](#10-shared-components)
11. [State Management](#11-state-management)
12. [API Layer](#12-api-layer)

---

## 1. Project Structure

```
frontend/
├── app/                              # Next.js App Router
│   ├── (public)/                     # layout: minimal header + footer
│   │   ├── page.tsx                  # Landing page
│   │   ├── about/page.tsx
│   │   ├── pricing/page.tsx
│   │   └── contact/page.tsx
│   │
│   ├── (auth)/                       # layout: centered card, no nav
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── (customer)/                   # layout: sidebar nav + top bar
│   │   ├── dashboard/page.tsx
│   │   ├── book/
│   │   │   ├── page.tsx              # Step 1: service selection
│   │   │   ├── schedule/page.tsx     # Step 2: pickup/delivery time
│   │   │   ├── review/page.tsx       # Step 3: review + promo
│   │   │   └── confirm/page.tsx      # Step 4: payment + confirm
│   │   ├── orders/
│   │   │   ├── page.tsx              # Order history list
│   │   │   └── [id]/page.tsx         # Order detail + tracker
│   │   ├── chat/
│   │   │   ├── page.tsx              # Chat room list
│   │   │   └── [roomId]/page.tsx     # Chat thread
│   │   ├── loyalty/page.tsx          # Points balance + history
│   │   ├── notifications/page.tsx
│   │   └── settings/
│   │       ├── page.tsx              # Profile settings
│   │       ├── preferences/page.tsx  # Laundry preferences
│   │       └── payments/page.tsx     # Saved payment methods
│   │
│   ├── (admin)/                      # layout: admin sidebar
│   │   ├── admin/
│   │   │   ├── page.tsx              # Admin overview dashboard
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx          # All orders table
│   │   │   │   └── [id]/page.tsx     # Order management detail
│   │   │   ├── payments/
│   │   │   │   ├── page.tsx          # Revenue + transactions
│   │   │   │   └── refunds/page.tsx  # Refund queue
│   │   │   ├── discounts/
│   │   │   │   ├── page.tsx          # Promo codes list
│   │   │   │   └── new/page.tsx      # Create campaign
│   │   │   ├── chat/page.tsx         # Agent inbox
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx          # Customer list
│   │   │   │   └── [id]/page.tsx     # Customer profile
│   │   │   ├── staff/page.tsx        # Staff management
│   │   │   └── analytics/page.tsx    # Revenue + retention charts
│   │
│   ├── api/                          # Next.js route handlers (BFF layer)
│   │   └── [...proxy]/route.ts       # Proxy to Django API
│   │
│   ├── layout.tsx                    # Root layout (fonts, providers)
│   ├── not-found.tsx
│   └── error.tsx
│
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   ├── layout/                       # Header, Sidebar, Footer, etc.
│   ├── auth/                         # Auth-specific components
│   ├── booking/                      # Multi-step booking components
│   ├── orders/                       # Order cards, tracker, history
│   ├── payments/                     # Payment form, method selector
│   ├── discounts/                    # Promo input, loyalty widget
│   ├── chat/                         # Chat UI components
│   ├── notifications/                # Toast, notification bell
│   └── admin/                        # Admin-only components
│
├── lib/
│   ├── api/                          # React Query hooks + fetchers
│   │   ├── auth.ts
│   │   ├── orders.ts
│   │   ├── payments.ts
│   │   ├── discounts.ts
│   │   ├── chat.ts
│   │   └── notifications.ts
│   ├── stores/                       # Zustand stores
│   │   ├── auth.store.ts
│   │   ├── booking.store.ts
│   │   └── chat.store.ts
│   ├── socket.ts                     # WebSocket client singleton
│   ├── utils.ts
│   └── constants.ts
│
├── types/                            # Shared TypeScript interfaces
│   ├── user.ts
│   ├── order.ts
│   ├── payment.ts
│   ├── discount.ts
│   └── chat.ts
│
├── hooks/                            # Custom React hooks
│   ├── useAuth.ts
│   ├── useBooking.ts
│   ├── useSocket.ts
│   └── useNotifications.ts
│
└── middleware.ts                     # Route protection (JWT check)
```

---

## 2. Auth Flows

### 2.1 Registration

```
Flow: /register

Steps:
  1. User fills RegisterForm
     - Full name, email, phone number, password, confirm password
  2. Submit → POST /api/v1/auth/register/
  3. On success → redirect to /login?registered=true (show success toast)
  4. On error → inline field errors from DRF

Components:
  - RegisterForm
      - <Input> name, email, phone, password
      - <PasswordStrengthMeter>
      - <Button type="submit">
  - OAuthButtons (Google, Facebook)
      - triggers OAuth redirect → Django handles token exchange
  - FormFeedback (error banner)

Validations (client-side):
  - Email format
  - Phone: Cameroon format (+237 prefix)
  - Password: min 8 chars, 1 uppercase, 1 number
  - Passwords match
```

### 2.2 Login

```
Flow: /login

Steps:
  1. User enters email + password
  2. Submit → POST /api/v1/auth/login/ → returns { access, refresh }
  3. Store tokens: access in memory (Zustand), refresh in httpOnly cookie
  4. Redirect to /dashboard
  5. On failure → show "Invalid credentials" banner

Components:
  - LoginForm
      - <Input> email, password
      - <PasswordToggle> (show/hide)
      - "Forgot password?" link
      - <Button type="submit">
  - OAuthButtons
  - FormFeedback

Token strategy:
  - access token: Zustand store (in-memory, lost on refresh)
  - refresh token: httpOnly cookie (set by Next.js route handler)
  - On page refresh: silent refresh via /api/v1/auth/token/refresh/
```

### 2.3 Forgot / Reset Password

```
Flow: /forgot-password → email → /reset-password?token=<uid>

Steps:
  1. ForgotPasswordForm: email input → POST /api/v1/auth/password/reset/
  2. Show "Check your inbox" confirmation screen
  3. User clicks email link → /reset-password?token=xxx&uid=xxx
  4. ResetPasswordForm: new password + confirm → POST /api/v1/auth/password/reset/confirm/
  5. Success → redirect to /login with toast

Components:
  - ForgotPasswordForm
  - ResetPasswordForm
  - SuccessScreen (check email illustration + instructions)
```

### 2.4 Route Protection (middleware.ts)

```
Rules:
  - (auth) routes: redirect to /dashboard if already logged in
  - (customer) routes: redirect to /login if no valid token
  - (admin) routes: redirect to /login if not staff/superuser
  - Token expiry: attempt silent refresh; if fails, clear store + redirect /login
```

---

## 3. Customer Flows

### 3.1 Dashboard

```
Page: /dashboard

Sections:
  1. Welcome banner (name, loyalty points balance)
  2. Active orders strip (scrollable cards of in-progress orders)
  3. Quick action buttons: [New Order] [Track Order] [Chat Support]
  4. Recent orders table (last 5, with status badges)
  5. Promotions carousel (active discount banners)

Components:
  - WelcomeBanner
      - props: user.firstName, loyaltyPoints
  - ActiveOrderStrip
      - maps over active orders → <OrderStatusCard>
  - QuickActions (3 icon buttons)
  - RecentOrdersTable
      - columns: order #, date, services, total, status, [View] button
  - PromoBannerCarousel
      - auto-scrolling, links to /book
```

### 3.2 Profile & Settings

```
Page: /settings

Tabs:
  1. Profile
     - avatar upload, full name, email (read-only), phone
     - PUT /api/v1/users/me/
  2. Laundry Preferences
     - water temperature (cold / warm / hot)
     - spin speed, fabric care notes, preferred detergent
     - PUT /api/v1/users/me/preferences/
  3. Payment Methods
     - list saved cards + Mobile Money numbers
     - [Add Card] → Stripe Elements modal
     - [Remove] with confirmation dialog
  4. Security
     - Change password form
     - Active sessions list with [Revoke] per session

Components:
  - SettingsTabs (shadcn Tabs)
  - AvatarUpload
      - drag-drop or click, preview, POST to /api/v1/users/me/avatar/
  - ProfileForm
  - PreferencesForm
  - PaymentMethodList
      - <PaymentMethodCard> (card brand icon, last 4, expiry, [Remove])
      - <AddPaymentMethodModal> (Stripe Elements)
  - ChangePasswordForm
  - SessionList
```

### 3.3 Loyalty Points

```
Page: /loyalty

Sections:
  1. Points balance card (large number + tier badge: Bronze/Silver/Gold)
  2. Points earning rules (e.g. 1 point per 500 FCFA spent)
  3. Redemption calculator (slider: how many points → FCFA discount)
  4. Transaction history table (earned / redeemed / expired)

Components:
  - LoyaltyBalanceCard
      - pointsBalance, tier, progress bar to next tier
  - EarningRulesPanel
  - RedemptionCalculator
      - <Slider> points → computed discount
      - [Redeem at Checkout] button → navigates to /book with points pre-applied
  - LoyaltyTransactionTable
      - columns: date, description, points change, balance after
```

---

## 4. Booking & Order Flows

### 4.1 Multi-Step Booking Wizard

```
Route: /book → /book/schedule → /book/review → /book/confirm

State: Zustand bookingStore (persisted across steps)

Step 1 — Service Selection (/book)
─────────────────────────────────
  Components:
    - ServiceGrid
        - cards: Wash Only, Wash + Dry, Wash + Dry + Fold, Ironing, Express
        - each card: icon, name, base price/kg, select toggle
    - ServiceDetailPanel (slides in on select)
        - description, estimated turnaround, price breakdown
    - WeightEstimator
        - number input (kg) → live price estimate updates
    - [Continue] button → validates at least 1 service selected

Step 2 — Schedule (/book/schedule)
────────────────────────────────────
  Components:
    - OrderTypeSelector
        - radio: Drop-off in store | Pickup from home | Delivery to home
    - AddressPicker (shown if Pickup or Delivery)
        - saved addresses dropdown + [+ New address] form
        - map preview (Leaflet.js)
    - DateTimePicker
        - calendar → selects date
        - TimeSlotGrid → available slots from API (GET /api/v1/schedule/slots/)
        - grayed-out slots = unavailable
    - SpecialInstructions textarea
    - [Back] [Continue]

Step 3 — Review & Promo (/book/review)
────────────────────────────────────────
  Components:
    - OrderSummaryCard
        - services list, weight, subtotal, taxes
    - PromoCodeInput
        - text input + [Apply] → POST /api/v1/discounts/promo/validate/
        - shows success (discount line) or error inline
    - LoyaltyPointsToggle
        - checkbox: use X points (= FCFA discount)
        - updates total live
    - PricingBreakdown
        - subtotal, promo discount, loyalty discount, tax, total
    - [Back] [Proceed to Payment]

Step 4 — Payment & Confirm (/book/confirm)
────────────────────────────────────────────
  Components:
    - PaymentMethodSelector
        - tabs: Card | Mobile Money | Pay on Pickup
        - Card: Stripe Elements (CardElement)
        - Mobile Money: phone number input + provider selector (MTN/Orange)
        - Pay on Pickup: info note only
    - FinalOrderSummary (compact, read-only)
    - TermsCheckbox
    - [Place Order] button
        - → POST /api/v1/orders/ (creates order)
        - → POST /api/v1/payments/initiate/ (initiates payment)
        - on success → /orders/<id>?confirmed=true (confirmation screen)
        - on payment failure → inline error + retry option
```

### 4.2 Order Detail & Tracker

```
Page: /orders/[id]

Sections:
  1. Confirmation banner (shown once via ?confirmed=true query param)
  2. Order status tracker (visual stepper)
  3. Order items & pricing breakdown
  4. Pickup/delivery details
  5. [Chat about this order] button → opens/creates chat room linked to order
  6. [Download Receipt] button

Components:
  - OrderConfirmationBanner (dismissible, shows only on first visit)
  - OrderStatusStepper
      - steps: Received → Confirmed → In Progress → Ready → Out for Delivery → Delivered
      - current step highlighted, completed steps checked
      - real-time updates via WebSocket (subscribe to order.<id> channel)
  - OrderItemsTable
  - PricingBreakdown (read-only)
  - ScheduleDetails (pickup/delivery address + time)
  - OrderActionBar
      - [Chat Support] [Download Receipt] [Cancel Order] (if PENDING only)
  - CancelOrderDialog
      - confirmation modal with reason selector

Real-time:
  - On mount: ws.subscribe(`order.${id}`) → on status_update event → update stepper
```

### 4.3 Order History

```
Page: /orders

Components:
  - OrderFilters
      - status filter (All / Active / Completed / Cancelled)
      - date range picker
      - search by order number
  - OrderHistoryTable
      - columns: order #, date, services, total, status badge, [View] link
      - pagination (20 per page)
  - EmptyState (no orders yet → [Book your first order] CTA)
```

---

## 5. Payment Flows

### 5.1 Card Payment (Stripe)

```
Trigger: User selects "Card" in Step 4 of booking

Flow:
  1. Render <CardElement> (Stripe.js)
  2. [Place Order] click:
     a. POST /api/v1/orders/ → get order_id
     b. POST /api/v1/payments/initiate/ { order_id, method: "card" }
        → returns { client_secret }
     c. stripe.confirmCardPayment(client_secret)
     d. On success → redirect /orders/<id>?confirmed=true
     e. On failure → show PaymentErrorBanner with reason + [Retry]

Components:
  - StripeCardForm
      - wraps <CardElement> with custom styling
  - PaymentErrorBanner
      - error message + [Try Again] + [Use Different Method]
  - PaymentProcessingOverlay
      - full-screen loading state during stripe.confirmCardPayment()
```

### 5.2 Mobile Money Payment

```
Trigger: User selects "Mobile Money" tab

Flow:
  1. User selects provider (MTN MoMo / Orange Money)
  2. User enters phone number
  3. [Place Order] click:
     a. POST /api/v1/orders/ → order_id
     b. POST /api/v1/payments/initiate/ { order_id, method: "momo", phone, provider }
     c. Backend initiates push to phone → user gets USSD prompt on their handset
     d. Frontend polls GET /api/v1/payments/<id>/status/ every 5s
     e. Show MomoWaitingScreen (animated phone + "Check your phone" message)
     f. On status = SUCCESS → redirect /orders/<id>?confirmed=true
     g. On status = FAILED / TIMEOUT → show error + retry

Components:
  - MomoProviderSelector (MTN logo | Orange logo radio)
  - MomoPhoneInput (pre-fill from user profile)
  - MomoWaitingScreen
      - animated phone icon, countdown timer (2 min timeout)
      - [Cancel] button
  - PaymentStatusPoller (headless, runs on mount when method = momo)
```

### 5.3 Invoices & Receipts

```
Page: /orders/[id] → [Download Receipt]

Flow:
  1. GET /api/v1/invoices/<order_id>/ → returns PDF URL
  2. Open PDF in new tab OR trigger download

Components:
  - ReceiptDownloadButton
      - loading state while fetching URL
      - opens signed S3 URL
```

### 5.4 Refund Request

```
Trigger: customer contacts support via chat OR from order detail page

Flow:
  1. [Request Refund] button on completed order (time-limited, e.g. 48h)
  2. RefundRequestModal:
     - reason selector (damaged item / wrong service / late delivery / other)
     - description textarea
     - photo upload (optional)
  3. POST /api/v1/refunds/ → creates refund request
  4. Show "Refund under review" banner on order detail
  5. Notification when refund approved/rejected

Components:
  - RefundRequestButton (shown only if order completed + within refund window)
  - RefundRequestModal
      - <Select> reason
      - <Textarea> description
      - <PhotoUpload> (max 3 images)
  - RefundStatusBadge (Pending / Approved / Rejected)
```

### 5.5 Subscriptions / Bundles

```
Page: /settings/payments → "Bundles" tab

Flow:
  1. GET /api/v1/subscriptions/bundles/ → list available bundles
  2. User selects bundle (e.g. "10 washes – 15% off")
  3. [Subscribe] → payment flow (card only for subscriptions)
  4. On success → bundle appears in active subscriptions
  5. Bundle auto-applies discount during booking

Components:
  - BundleCard
      - name, washes included, price, savings %, [Subscribe]
  - ActiveSubscriptionCard
      - washes remaining progress bar, renewal date, [Cancel]
```

---

## 6. Discounts & Loyalty Flows

### 6.1 Promo Code

```
Trigger: Step 3 of booking wizard (/book/review)

Flow:
  1. User types promo code → [Apply]
  2. POST /api/v1/discounts/promo/validate/ { code, order_total }
  3. On valid:
     - discount line appears in PricingBreakdown
     - code stored in bookingStore
  4. On invalid:
     - inline error: "Code expired", "Already used", "Min order not met", etc.
  5. [Remove] clears discount from store + recalculates total

Components:
  - PromoCodeInput
      - text input + [Apply] / [Remove] toggle
      - loading state during validation
      - SuccessBadge (code name + discount amount)
      - ErrorMessage (reason)
```

### 6.2 Loyalty Points Redemption

```
Trigger: Step 3 of booking wizard (toggle)

Flow:
  1. LoyaltyPointsToggle shows available points + FCFA equivalent
  2. User checks toggle → points deducted from total in UI
  3. Points amount stored in bookingStore
  4. On order confirmation → POST /api/v1/discounts/loyalty/redeem/ { order_id, points }

Components:
  - LoyaltyPointsToggle
      - checkbox + "Use 500 pts = 2,500 FCFA off"
      - disabled if 0 points or total already 0
```

### 6.3 Referral Program

```
Page: /loyalty → "Refer a Friend" section

Flow:
  1. Display unique referral link (GET /api/v1/users/me/referral-code/)
  2. [Copy Link] + [Share via WhatsApp] buttons
  3. When referred user completes first order → both get points
  4. Referral status list (pending / converted)

Components:
  - ReferralLinkCard
      - referral URL display + [Copy] button
      - WhatsApp share button (opens wa.me link)
  - ReferralStatusList
      - rows: invitee email (masked), status, points earned
```

---

## 7. Chat & Support Flows

### 7.1 Customer Chat

```
Page: /chat → /chat/[roomId]

Flow — Starting a chat:
  1. From /orders/[id] → [Chat about this order]
     → POST /api/v1/chat/rooms/ { order_id }
     → if room exists for this order, returns existing room
     → redirect /chat/<roomId>
  2. From /dashboard → [Chat Support] → general support room

Flow — Chat thread:
  1. On mount:
     a. GET /api/v1/chat/rooms/<id>/messages/ → load history (paginated, oldest first)
     b. ws.connect(`/ws/chat/<roomId>/`) → subscribe to new messages
  2. User types message → [Send]
     a. Optimistic UI: append message immediately (pending state)
     b. POST /api/v1/chat/rooms/<id>/messages/ { content }
     c. On WS event message_received → append to thread (dedup by id)
  3. Photo upload:
     a. [Attach] → file picker → POST with multipart form
     b. Show image thumbnail in thread
  4. Mark messages read on scroll into view → PATCH /api/v1/chat/rooms/<id>/read/

Components:
  - ChatRoomList (/chat)
      - each row: order number (if linked), last message preview, timestamp, unread badge
  - ChatThread (/chat/[roomId])
      - ChatHeader (order link, agent name if assigned)
      - MessageList
          - MessageBubble (own = right/purple, agent = left/gray)
          - DateDivider between different days
          - TypingIndicator (animated dots when agent typing)
          - ImageAttachment (thumbnail + lightbox on click)
      - ChatInput
          - textarea (Enter to send, Shift+Enter for newline)
          - [Attach] icon button
          - [Send] button
          - CharacterLimit indicator
  - EmptyChat (no messages yet → "Send a message to get started")

Real-time events (WebSocket):
  - message_received → append bubble
  - agent_typing → show TypingIndicator
  - agent_joined → show "Agent X has joined" system message
  - room_closed → show "This chat has been resolved" banner
```

### 7.2 AI Chatbot (FAQ / Status)

```
Trigger: [Chat Support] when no agents available (configurable hours)

Flow:
  1. Bot greeting: "Hi! I'm the Laundromat assistant. How can I help?"
  2. Quick reply chips: [Track my order] [Pricing info] [Schedule pickup] [Talk to agent]
  3. "Track my order" → bot asks for order number → GET order status → formatted reply
  4. "Talk to agent" → POST /api/v1/chat/rooms/ { escalate: true }
     → creates room + notifies available agents
  5. If agents offline → "Our team is offline. We'll reply at 8am."

Components:
  - BotMessageBubble (distinct style: bot avatar + lighter bg)
  - QuickReplyChips (horizontal scrollable pill buttons)
  - BotTypingIndicator (shows briefly before bot "responds")
  - EscalationBanner ("Connecting you to an agent…")
```

---

## 8. Notifications

### 8.1 In-App Notification Bell

```
Location: top bar (all authenticated layouts)

Components:
  - NotificationBell
      - bell icon + unread count badge
      - click → NotificationDropdown (max 5 recent)
      - [View all] → /notifications
  - NotificationDropdown
      - NotificationItem rows: icon, title, body, time ago, unread dot
      - click item → navigates to relevant page (order, chat, etc.)
  - NotificationsPage (/notifications)
      - full list, paginated
      - [Mark all read] button
      - grouped by date

Real-time:
  - WS event notification_received → increment badge + prepend to dropdown
```

### 8.2 Toast Notifications

```
Triggers: order status updates, payment success/fail, promo applied, etc.

Component: <Toaster> (shadcn/ui Toast, rendered in root layout)

Variants:
  - success (green): "Order confirmed!", "Payment received"
  - info (blue): "Order is ready for pickup"
  - warning (amber): "Your session is about to expire"
  - error (red): "Payment failed. Please try again."

Usage pattern:
  toast.success("Order #1234 confirmed!")
  toast.error("Payment declined", { description: "Insufficient funds" })
```

---

## 9. Admin Dashboard Flows

### 9.1 Overview Dashboard (/admin)

```
Sections:
  1. KPI cards row: Today's orders, Revenue today, Active chats, Pending pickups
  2. Revenue chart (line, last 30 days) with period selector
  3. Orders by status (donut chart)
  4. Recent orders table (last 10, with quick [Update Status] action)
  5. Active chat queue (unassigned chats count + [Go to inbox])

Components:
  - KpiCard (value, label, trend arrow vs yesterday)
  - RevenueChart (Recharts LineChart)
  - OrderStatusDonut (Recharts PieChart)
  - AdminRecentOrdersTable
  - ChatQueueBadge
```

### 9.2 Orders Management (/admin/orders)

```
Sections:
  1. Filters: status, date range, service type, search by customer/order#
  2. Orders data table (sortable columns)
  3. Order detail panel (slide-over on row click)

Components:
  - AdminOrderFilters
  - AdminOrdersTable
      - columns: order #, customer, services, total, status, pickup time, actions
      - inline [Update Status] dropdown per row
      - bulk select + [Bulk Update Status]
  - OrderDetailSlideOver
      - full order info
      - StatusUpdateForm (select new status + optional note)
      - [Assign to Staff] dropdown
      - [View Chat] link
      - [Trigger Notification] button (manually notify customer)
```

### 9.3 Payments & Revenue (/admin/payments)

```
Sections:
  1. Revenue summary cards: total, card payments, MoMo payments, cash
  2. Transactions table with filters
  3. Refund queue tab

Components:
  - RevenueSummaryCards
  - TransactionsTable
      - columns: date, order #, customer, amount, method, status
      - [Download CSV] export
  - RefundQueueTable (/admin/payments/refunds)
      - columns: order #, customer, reason, amount, requested at, status
      - [Approve] [Reject] action buttons per row
      - ApproveRefundDialog (confirm amount + note)
      - RejectRefundDialog (rejection reason required)
```

### 9.4 Discounts Management (/admin/discounts)

```
Sections:
  1. Active promos table
  2. [+ New Campaign] button → /admin/discounts/new

Components:
  - PromoCodesTable
      - columns: code, type, discount, uses, limit, expiry, status, actions
      - [Deactivate] toggle per row
  - CreateCampaignForm (/admin/discounts/new)
      - campaign name
      - discount type: (percentage | fixed | free service)
      - value input
      - applicable services (multi-select)
      - usage limit (per user + total)
      - date range picker (active from → expires at)
      - auto-generate code toggle vs custom code input
      - min order amount
      - [Preview discount] live calculation
      - [Save & Activate] / [Save as Draft]
```

### 9.5 Chat Agent Inbox (/admin/chat)

```
Layout: two-panel (room list left, thread right)

Flow:
  1. Load all open chat rooms sorted by: unassigned first, then oldest
  2. Agent clicks room → loads thread (same ChatThread component as customer)
  3. [Assign to me] button → PATCH /api/v1/chat/rooms/<id>/ { assigned_to: me }
  4. Agent types in ChatInput → WS sends to customer in real-time
  5. [Resolve] button → PATCH room status to CLOSED → customer sees closure banner

Components:
  - AgentRoomList
      - filter tabs: All | Unassigned | Mine | Resolved
      - RoomListItem: customer name, order link, last message, time, unread dot
  - AgentChatThread
      - reuses ChatThread component
      - extra: AgentToolbar (Assign / Resolve / Link order / View customer profile)
  - CustomerContextPanel (right side, collapsible)
      - customer name, phone, loyalty tier, order history summary
```

### 9.6 Customers (/admin/customers)

```
Components:
  - CustomerSearchTable
      - search by name / email / phone
      - columns: name, email, phone, orders count, total spent, loyalty tier, joined
      - [View Profile] link per row
  - CustomerProfilePage (/admin/customers/[id])
      - personal info + edit form
      - orders history table
      - loyalty transactions
      - [Manually add points] form
      - [Suspend account] with confirmation
```

### 9.7 Analytics (/admin/analytics)

```
Sections:
  1. Date range selector (last 7d / 30d / 90d / custom)
  2. Revenue over time (line chart)
  3. Orders by service type (bar chart)
  4. Peak hours heatmap (hour × weekday grid, color = order volume)
  5. Customer retention (cohort table or repeat order %)
  6. Discount usage (bar: revenue lost vs. new customers acquired via promos)

Components:
  - DateRangeSelector
  - RevenueLineChart (Recharts)
  - ServiceBreakdownBarChart (Recharts)
  - PeakHoursHeatmap (custom SVG or D3)
  - RetentionMetricCard
  - DiscountImpactChart
```

---

## 10. Shared Components

### Layout

```
CustomerLayout
  ├── TopBar
  │   ├── Logo
  │   ├── SearchBar (order search)
  │   ├── NotificationBell
  │   └── UserAvatarMenu (profile, settings, logout)
  └── CustomerSidebar
      ├── NavItem: Dashboard
      ├── NavItem: Book a Service
      ├── NavItem: My Orders
      ├── NavItem: Chat Support
      ├── NavItem: Loyalty & Rewards
      └── NavItem: Settings

AdminLayout
  ├── AdminTopBar (breadcrumb + user menu)
  └── AdminSidebar
      ├── NavItem: Dashboard
      ├── NavItem: Orders
      ├── NavItem: Payments
      ├── NavItem: Discounts
      ├── NavItem: Chat Inbox (with unread badge)
      ├── NavItem: Customers
      ├── NavItem: Staff
      └── NavItem: Analytics
```

### Reusable UI Components

```
StatusBadge
  - props: status (PENDING | CONFIRMED | IN_PROGRESS | READY | DELIVERED | CANCELLED)
  - maps to color: amber | blue | purple | green | teal | red

OrderStatusStepper
  - props: currentStatus, steps[]
  - horizontal on desktop, vertical on mobile

PricingBreakdown
  - props: subtotal, promoDiscount, loyaltyDiscount, tax, total
  - renders itemized list + total line

EmptyState
  - props: icon, title, description, ctaLabel, ctaHref
  - used across all empty list pages

ConfirmDialog
  - shadcn AlertDialog wrapper
  - props: title, description, confirmLabel, onConfirm, variant (danger | default)

PhotoUpload
  - drag-drop zone + click to upload
  - preview grid with [Remove] per image
  - validates type (jpg/png/webp) and size (max 5MB)

DataTable
  - built on TanStack Table
  - props: columns, data, pagination, onRowClick
  - built-in: sorting, column visibility toggle, CSV export

LoadingSpinner / PageSkeleton
  - full-page skeleton for initial data load
  - inline spinner for button loading states
```

---

## 11. State Management

### Zustand Stores

```typescript
// lib/stores/auth.store.ts
interface AuthStore {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  login: (credentials) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

// lib/stores/booking.store.ts
interface BookingStore {
  selectedServices: Service[]
  weightKg: number
  orderType: 'drop-off' | 'pickup' | 'delivery'
  address: Address | null
  scheduledSlot: TimeSlot | null
  promoCode: PromoCode | null
  usePoints: boolean
  pointsToRedeem: number
  // computed
  subtotal: number
  discount: number
  total: number
  // actions
  setService: (service) => void
  removeService: (id) => void
  setSchedule: (slot, address) => void
  applyPromo: (promo) => void
  clearBooking: () => void
}

// lib/stores/chat.store.ts
interface ChatStore {
  activeRoomId: string | null
  unreadCount: number
  typingRoomIds: string[]
  setActiveRoom: (id) => void
  incrementUnread: () => void
  markRoomRead: (id) => void
}
```

### React Query Keys Convention

```typescript
// Consistent cache key factory
export const queryKeys = {
  orders: {
    all: ['orders'],
    list: (filters) => ['orders', 'list', filters],
    detail: (id) => ['orders', id],
  },
  payments: {
    status: (id) => ['payments', id, 'status'],
    invoices: (orderId) => ['invoices', orderId],
  },
  chat: {
    rooms: ['chat', 'rooms'],
    messages: (roomId) => ['chat', roomId, 'messages'],
  },
  discounts: {
    validate: (code) => ['discounts', 'validate', code],
    loyalty: ['discounts', 'loyalty'],
  },
}
```

---

## 12. API Layer

### Axios Instance + Interceptors

```typescript
// lib/api/client.ts
const apiClient = axios.create({ baseURL: '/api/v1' })

// Request interceptor: attach access token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: silent token refresh on 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().refreshToken()
      return apiClient(error.config)  // retry original request
    }
    return Promise.reject(error)
  }
)
```

### React Query Hook Pattern

```typescript
// lib/api/orders.ts
export const useOrders = (filters: OrderFilters) =>
  useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => apiClient.get('/orders/', { params: filters }).then(r => r.data),
  })

export const useOrder = (id: string) =>
  useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => apiClient.get(`/orders/${id}/`).then(r => r.data),
  })

export const useCreateOrder = () =>
  useMutation({
    mutationFn: (data: CreateOrderPayload) =>
      apiClient.post('/orders/', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
    },
  })
```

### WebSocket Client

```typescript
// lib/socket.ts
class SocketClient {
  private ws: WebSocket | null = null

  connect(roomId: string, token: string) {
    this.ws = new WebSocket(`wss://<host>/ws/chat/${roomId}/?token=${token}`)
    this.ws.onmessage = (e) => this.handleMessage(JSON.parse(e.data))
  }

  send(type: string, payload: object) {
    this.ws?.send(JSON.stringify({ type, ...payload }))
  }

  subscribe(event: string, handler: (data) => void) { /* EventEmitter pattern */ }

  disconnect() { this.ws?.close() }
}

export const socketClient = new SocketClient()
```

---

## Page → API Endpoint Map (Quick Reference)

| Page | Method | Endpoint |
|---|---|---|
| `/register` | POST | `/auth/register/` |
| `/login` | POST | `/auth/login/` |
| `/dashboard` | GET | `/orders/?status=active` |
| `/book` | GET | `/orders/services/` |
| `/book/schedule` | GET | `/schedule/slots/?date=` |
| `/book/review` | POST | `/discounts/promo/validate/` |
| `/book/confirm` | POST | `/orders/` then `/payments/initiate/` |
| `/orders` | GET | `/orders/` |
| `/orders/[id]` | GET | `/orders/<id>/` |
| `/orders/[id]` (cancel) | PATCH | `/orders/<id>/cancel/` |
| `/loyalty` | GET | `/discounts/loyalty/` |
| `/loyalty` (redeem) | POST | `/discounts/loyalty/redeem/` |
| `/chat` | GET | `/chat/rooms/` |
| `/chat/[id]` | GET | `/chat/rooms/<id>/messages/` |
| `/settings` | PUT | `/users/me/` |
| `/settings/preferences` | PUT | `/users/me/preferences/` |
| `/admin/orders` | GET | `/orders/?all=true` |
| `/admin/payments` | GET | `/payments/` |
| `/admin/discounts/new` | POST | `/discounts/campaigns/` |
| `/admin/chat` | GET | `/chat/rooms/?all=true` |
| `/admin/analytics` | GET | `/analytics/summary/` |
