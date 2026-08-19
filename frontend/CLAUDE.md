# WEDEMBOYZ — Site Design System

This is the source of truth for design and copy decisions across the entire site — Hero, About, Services, Pricing, Booking, FAQ, and anything added later. Read this before building or editing any page.

---

## Brand

**WEDEMBOYZ** is a pickup-and-delivery laundry service in Yaoundé, Cameroon: book a pickup, they wash/iron/dry-clean, and deliver it back. No storefront visit required.

**Personality:** Friendly, local, warm, and full of energy — the neighborhood laundry spot everyone's happy to see, not a startup. Plain language, no jargon, no upsell pressure — but delivered with genuine enthusiasm, not flat simplicity. Confident about being straightforward: the price is the price, the process is the process, said once, clearly, with a smile.

The site should feel **alive**: color, motion, and small delightful moments that make doing laundry — normally a chore — feel easy and even a little fun. Every page should reward exploring it, not just reading it.

---

## Users

Customers in Yaoundé comparing WEDEMBOYZ against doing laundry themselves or using an informal option. Before booking, they need to quickly trust that:
- the price is fair and clearly stated in XAF, no hidden totals
- the service is legit and reliable (real people, real pickup times, real delivery)
- paying by cash, MTN Mobile Money, or Orange Money will be simple

Every page should reduce hesitation and move the visitor toward booking a pickup — without ever feeling pushy.

---

## Voice & Copy

- Write like a real person from the neighborhood, not a brand team. Short sentences. Everyday words.
- Say things once, plainly. No "starting at," no asterisks, no fine print doing the real explaining.
- Warmth comes through in word choice and rhythm, not exclamation points stacked on every line.
- Humor is welcome if it sounds like a friend, not a copywriter trying to be funny.
- Never use SaaS language: no "plans," "tiers," "seats," "unlock," "upgrade." This is a laundry service, not software.

---

## Visual Language — "Fold Line"

The site's visual identity is built around the idea of freshly folded, cared-for laundry.

**Anchors (keep across every page):**
- Navy and gold remain the structural anchors — navy for grounding/trust, gold for warmth and calls to action.
- Crease dividers — the folded-fabric-line motif used to separate sections — stay as a signature device, but can now animate (a fold that unfolds on scroll, a crease that "presses" into place).
- Fabric-care iconography (wash, iron, dry-clean, fold symbols) stays as the icon language, but should feel hand-finished and warm, not like generic line-icons from a UI kit.

**Expand from here into a fuller, energetic palette:**
- Treat navy/gold as the frame, and bring in a wider, vibrant supporting palette inspired by fresh laundry and sunshine — think warm coral, soft turquoise, sunny yellow, clean white, a touch of clothesline-green. Each service type (Wash & Fold, Wash & Iron, Dry Clean, Iron Only) can carry its own accent color for quick visual recognition across the site.
- Color should do wayfinding work — the same service always reads in the same color, everywhere it appears (pricing, booking, service icons).
- Avoid the two failure modes on either end: don't collapse into flat corporate SaaS blue/gray minimalism, and don't wash out the navy/gold identity with rainbow noise. Vibrant but still clearly WEDEMBOYZ.

---

## Motion & Interactivity

Motion is not decoration here — it's part of how the brand feels warm and trustworthy. Go heavy on interactivity, but keep it purposeful:

- **Micro-interactions everywhere it makes sense**: buttons that respond immediately on hover/tap, cards that lift, tilt, or highlight, icons with a small satisfying animation when interacted with.
- **Scroll-triggered reveals**: sections and cards can enter with a gentle, springy motion as the visitor scrolls — never a distraction from reading, always a welcome.
- **Celebratory payoffs**: moments that deserve delight should get it — e.g. hitting a free-delivery threshold, completing a booking step, selecting a service type. Small confetti-style or bounce moments are welcome where they reinforce good news.
- **Feel, not flash**: motion should feel springy, tactile, human — like a friendly wave hello — not slick, corporate, or attention-grabbing for its own sake. Favor natural easing curves over linear or mechanical ones.
- **Every interactive element needs a resting state, a hover/focus state, and (where relevant) an active/pressed state** — designed with the same care as the default view.

---

## Components & Patterns

- **No SaaS pricing conventions**: no three-tier comparison cards, no "Most Popular" badges, no feature-checkmark matrices, no per-seat/per-month framing. Pricing here is per-kilo and per-service — let it look like that, not like a subscription plan.
- **Numbers are said once, plainly** — bold and confident, not hedged. A bold number can absolutely live on a colorful, animated page; clarity and energy aren't in tension.
- **Cards, not tables**, for anything comparing service types — cards can carry color, icon, and motion in a way tables can't.
- **CTAs** (e.g. "Book a Pickup") should always be gold, always clear, and should feel inviting rather than urgent — no countdown timers, no artificial scarcity.

---

## Accessibility & Inclusion

Standard WCAG 2.1 AA across the whole site:
- Body text ≥4.5:1 contrast, large/display text ≥3:1.
- Visible focus states on every interactive element — focus states should carry the same care and personality as hover states, not a default browser outline.
- Respect `prefers-reduced-motion` on every animation. This does not limit how animated or interactive the site is for the vast majority of visitors — it only provides a static/simplified fallback for the subset of users who've set that OS-level preference, often due to vestibular or migraine conditions. Every animated component needs a reduced-motion equivalent that still communicates the state change (e.g. a color swap or instant reveal instead of a bounce).
- Don't rely on color alone to convey meaning (e.g. service-type color-coding should always pair with a label or icon, not color by itself).

No other specific accessibility needs stated for this user base at this time.

---

## Anti-references

Avoid at all costs:
- Generic enterprise SaaS pricing/UI conventions (tiered plans, "Most Popular" badges, feature matrices, per-seat framing).
- Flat, static, beige "minimalist" design that reads as lifeless or overly corporate-safe.
- Gradient-heavy, generic startup hero banners that could belong to any brand.
- Stock-photo energy or copy that sounds like it was written by a marketing team instead of a neighborhood business.

---

## Page-Specific Notes

*(Add a short section per page here as pages are built, e.g. Pricing, Booking Flow, FAQ — noting anything unique to that page's job. Keep the shared principles above as the baseline for all of them.)*