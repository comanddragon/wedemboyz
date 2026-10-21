"""
Management command: seed_data

Fills the database with a realistic, interconnected dataset sized for a
small laundromat — 1 owner + 3 employees, ~80 regular customers and roughly
4-5 orders a day over the last 90 days — across every app (users, orders,
payments, discounts, finance, inventory, chat, notifications, staff).

Idempotency
-----------
Running the command repeatedly is safe:

* Seed users are identified by the reserved email domain
  ``@seed.wedemboyz.invalid`` (the ``.invalid`` TLD can never route, so seed
  accounts can never email a real person). If seed staff already exist, the
  bulk/random data (users, orders, chats, expenses, ...) is NOT created again.
  The command only tops up the fixed reference data and exits cleanly.
* Reference data (promo codes, loyalty rules, discount campaigns, inventory
  items) is keyed on a natural key (code / name) and only created when missing.
* Everything runs in a single transaction, so a failure leaves the DB untouched.
* ``--force`` skips the "already seeded" check and stacks another batch of
  random data on top. Seed emails carry a per-run token, so batches never collide.
* ``--clear`` wipes seedable tables first, then reseeds.

Usage
-----
    python manage.py seed_data
    python manage.py seed_data --customers 200 --orders 1500 --staff 6
    python manage.py seed_data --seed 42          # reproducible run
    python manage.py seed_data --clear            # wipe seedable tables, then reseed
    python manage.py seed_data --clear-only       # wipe seedable tables and exit
    python manage.py seed_data --force            # add another batch on top

WARNING: there are no environment guards. `--clear` / `--clear-only` delete every
seedable table plus all non-superuser users on whatever database the settings
point at, with no confirmation prompt. Back up first if the data matters.
"""

import os
import random
import uuid
from datetime import timedelta, date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from faker import Faker

from apps.chat.models import ChatRoom, Message, MessageAttachment
from apps.discounts.models import (
    DiscountCampaign,
    DiscountType,
    LoyaltyRule,
    LoyaltyTransaction,
    PromoCode,
    PromoUsage,
)
from apps.finance.models import CreditAccount, CreditTransaction, Expense, ExpenseCategory, PayrollEntry
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryTransaction, InventoryUnit
from apps.notifications.models import Notification, NotificationPreference
from apps.orders.models.order import Order, OrderItem, OrderStatusHistory
from apps.orders.models.schedule import PickupDeliverySchedule
from apps.payments.models import Invoice, Payment, PaymentMethod, Refund, Subscription, generate_display_label
from apps.staff.models import StaffActivityLog, StaffInvite, StaffProfile, StaffRole
from apps.users.models import LoyaltyAccount, UserProfile

from core.constants import Currency, OrderStatus, PaymentGateway, PaymentStatus, ServiceType
from services.pricing import kg_allowance_for_plan

User = get_user_model()

# ---------------------------------------------------------------------------
# Seed marker. Every seeded user with an email gets an address on this domain;
# seed staff always have one, which is what the "already seeded?" check uses.
# ---------------------------------------------------------------------------
SEED_EMAIL_DOMAIN = "seed.wedemboyz.invalid"

# ---------------------------------------------------------------------------
# Faker instance for generic filler text only (freeform notes, etc). Locale
# mix leans French/English since that's the actual customer base; NOT used
# for names/cities/phone numbers — those stay hand-curated below so records
# still read as real Wedemboyz (Cameroon) data rather than generic output.
# ---------------------------------------------------------------------------
fake = Faker(["fr_FR", "en_US"])

# ---------------------------------------------------------------------------
# Data pools — Cameroon-flavoured so records look like real Wedemboyz data
# rather than generic Anglo-American Faker output.
# ---------------------------------------------------------------------------

FIRST_NAMES_M = [
    "Achille", "Bertrand", "Blaise", "Christian", "Divine", "Emmanuel", "Eric",
    "Franck", "Herve", "Ibrahim", "Junior", "Kevin", "Landry", "Marcel",
    "Modeste", "Ndongo", "Ousmane", "Patrick", "Rodrigue", "Serge", "Thierry",
    "Valery", "Yannick", "Alain", "Boris", "Cedric", "Donald", "Fabrice",
    "Giresse", "Hermann", "Innocent", "Joel", "Karl", "Loic", "Maxime",
]
FIRST_NAMES_F = [
    "Adele", "Aicha", "Aminatou", "Bernadette", "Carine", "Chantal",
    "Delphine", "Epiphanie", "Flore", "Gaelle", "Honorine", "Ingrid",
    "Josiane", "Larissa", "Marlyse", "Nadege", "Odile", "Pulcherie",
    "Rosine", "Sandrine", "Sylvie", "Vanessa", "Yvette", "Ariane",
    "Clarisse", "Danielle", "Estelle", "Francine", "Grace", "Huguette",
    "Ines", "Judith", "Linda", "Melanie", "Natacha",
]
LAST_NAMES = [
    "Ngo", "Mballa", "Fotso", "Kamga", "Njoya", "Tchoumi", "Eyenga", "Abena",
    "Ekotto", "Tabi", "Nkeng", "Fomekong", "Talla", "Bello", "Djoumessi",
    "Kouam", "Nguini", "Sonkeng", "Zang", "Ateba", "Owona", "Mvondo",
    "Essomba", "Nkolo", "Manga", "Onana", "Biloa", "Feudjio", "Kenmogne",
    "Wandji", "Yomba", "Simo", "Tchana", "Ndoumbe", "Assam",
]
CITIES = [
    "Douala", "Yaounde", "Bamenda", "Buea", "Limbe", "Bafoussam", "Kribi",
    "Garoua", "Ngaoundere", "Ebolowa", "Kumba", "Dschang",
]
NEIGHBORHOODS = [
    "Bonapriso", "Akwa", "Bonamoussadi", "Deido", "Ndogbong", "Makepe",
    "Bastos", "Mvan", "Mimboman", "Essos", "Nlongkak", "Biyem-Assi",
    "Nkwen", "Old Town", "Mile 4", "Mile 17", "Great Soppo", "Molyko",
    "Bonanjo", "Ange Raphael",
]
STREET_WORDS = ["Rue", "Avenue", "Carrefour", "Rond-point", "Quartier", "Bloc"]

ITEM_LABELS = [
    # Per-piece pressing/garment-care items ("NOUVEAUX PRIX" flyer).
    ("Veste", ServiceType.VESTE), ("T-shirt", ServiceType.TSHIRT),
    ("Chemise", ServiceType.CHEMISE), ("Pantalon", ServiceType.PANTALON),
    ("Pull", ServiceType.PULL), ("Robe de soirée", ServiceType.ROBE),
    ("Grande robe", ServiceType.ROBE), ("Ensemble", ServiceType.ENSEMBLE),
    ("Draps complet", ServiceType.DRAPS_COMPLET),
    ("Couette 1 place", ServiceType.COUETTE_1P),
    ("Couette 2 places", ServiceType.COUETTE_2P),
    ("Couette 3 places", ServiceType.COUETTE_3P),
    # Per-kg self-service lavomatique lines ("GRILLE DE PRIX" flyer).
    ("Load of laundry (wash & spin)", ServiceType.LAVAGE_ESSORAGE),
    ("Load of laundry (wash, spin & dry)", ServiceType.LAVAGE_SECHAGE),
    ("Storefront press & wrap", ServiceType.REPASSAGE_PLASTIF),
]

INVENTORY_ITEMS = [
    ("Omo Detergent Powder 5kg", InventoryCategory.DETERGENT, InventoryUnit.KG),
    ("Liquid Detergent (bulk)", InventoryCategory.DETERGENT, InventoryUnit.L),
    ("Downy Fabric Softener 1L", InventoryCategory.SOFTENER, InventoryUnit.L),
    ("Stain Remover Spray", InventoryCategory.DETERGENT, InventoryUnit.ML),
    ("Poly Garment Bags (100pc roll)", InventoryCategory.PACKAGING, InventoryUnit.PCS),
    ("Plastic Hangers (bundle)", InventoryCategory.PACKAGING, InventoryUnit.PCS),
    ("Garment Tags", InventoryCategory.PACKAGING, InventoryUnit.PCS),
    ("Washing Machine Drive Belt", InventoryCategory.EQUIPMENT, InventoryUnit.PCS),
    ("Steam Iron", InventoryCategory.EQUIPMENT, InventoryUnit.PCS),
    ("Ironing Board Cover", InventoryCategory.EQUIPMENT, InventoryUnit.PCS),
    ("Whitening Bleach 1L", InventoryCategory.DETERGENT, InventoryUnit.L),
]

# Fixed-identity reference data (natural keys: code / name).
SEED_PROMO_CODES = [
    ("WELCOME10", DiscountType.PERCENTAGE, Decimal("10")),
    ("SAVE500", DiscountType.FIXED, Decimal("500")),
    ("LOYALTY5", DiscountType.PERCENTAGE, Decimal("5")),
]
EXTRA_PROMO_CODES = ["PROMO100", "PROMO101"]  # index 0 is created already expired/inactive
SEED_PROMO_CODE_NAMES = [c[0] for c in SEED_PROMO_CODES] + EXTRA_PROMO_CODES

SEED_CAMPAIGN_NAMES = [
    "Rainy Season Wash & Fold", "End of Month Payday Deal", "First Order Welcome Campaign",
]

CHAT_CUSTOMER_LINES = [
    "Hi, just checking on my order status.",
    "Will my delivery still arrive today?",
    "Can you add an extra shirt to my pickup?",
    "The driver hasn't shown up yet, is everything OK?",
    "Do you handle dry cleaning for suits?",
    "I'd like to reschedule my pickup to tomorrow afternoon.",
    "Thanks, everything came back looking great!",
    "One of my items seems to be missing.",
    "Can I pay with MTN Mobile Money?",
    "How much would it cost to clean 3 bedsheets?",
    "Is there a discount for first-time customers?",
    "My promo code isn't applying at checkout.",
]
CHAT_AGENT_LINES = [
    "Hello! Let me check that for you right now.",
    "Your order is currently in progress, should be ready by this evening.",
    "No problem, I've added that note to your order.",
    "So sorry about that — I'm contacting the driver now.",
    "Yes, we do full dry cleaning for suits and gowns.",
    "Sure, I've moved your pickup to tomorrow's afternoon slot.",
    "Thank you so much, we're glad you're happy with it!",
    "I'm sorry to hear that — can you confirm the item's label?",
    "Yes, MTN MoMo and Orange Money are both accepted.",
    "That would come to roughly 2,500 - 3,500 XAF depending on weight.",
    "New customers get 10% off with code WELCOME10.",
    "Let me look into that promo code issue for you.",
]

EXPENSE_NOTES = {
    ExpenseCategory.SUPPLIES: [
        "Detergent and softener restock", "Packaging materials delivery",
        "Bulk order of hangers and poly bags",
    ],
    ExpenseCategory.UTILITIES: [
        "Monthly water bill", "Monthly electricity bill (ENEO)", "Generator diesel top-up",
    ],
    ExpenseCategory.MAINTENANCE: [
        "Washing machine repair", "Dryer belt replacement", "Generator servicing",
        "Delivery van maintenance",
    ],
    ExpenseCategory.RENT: ["Monthly shop rent"],
    ExpenseCategory.OTHER: [
        "Fuel for delivery motorbikes", "Marketing flyers printing", "Office supplies",
    ],
}

NOTIFICATION_TEMPLATES = {
    Notification.NotificationType.ORDER_UPDATE: [
        ("Order confirmed", "Your order #{ref} has been confirmed and is being prepared."),
        ("Order ready", "Your order #{ref} is ready for delivery."),
        ("Order delivered", "Your order #{ref} has been delivered. Thank you for choosing Wedemboyz!"),
        ("Order out for delivery", "Your order #{ref} is out for delivery, our rider is on the way."),
    ],
    Notification.NotificationType.PAYMENT: [
        ("Payment received", "We've received your payment for order #{ref}."),
        ("Payment failed", "Your payment for order #{ref} could not be processed."),
    ],
    Notification.NotificationType.PROMO: [
        ("Weekend discount", "Enjoy 15% off all Wash & Fold orders this weekend!"),
        ("Loyalty bonus", "You've earned bonus loyalty points this month."),
    ],
    Notification.NotificationType.CHAT: [
        ("New message", "You have a new message from support."),
    ],
    Notification.NotificationType.SYSTEM: [
        ("Welcome to Wedemboyz", "Thanks for signing up — book your first pickup today!"),
        ("Scheduled maintenance", "Our app will be briefly unavailable for maintenance tonight."),
    ],
}

STATUS_FLOW = [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.IN_PROGRESS,
    OrderStatus.READY,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
]


def rand_phone(used):
    prefix = random.choice(["65", "67", "68", "69", "650", "651", "680", "690", "691", "699"])
    while True:
        number = "237" + prefix + "".join(random.choices("0123456789", k=9 - len(prefix)))
        if number not in used:
            used.add(number)
            return number


def rand_test_phone(used):
    """Return a syntactically valid but intentionally non-routable test number."""
    while True:
        number = "237000" + "".join(random.choices("0123456789", k=6))
        if number not in used:
            used.add(number)
            return number


def rand_address():
    return f"{random.choice(STREET_WORDS)} {random.randint(1, 200)}, {random.choice(NEIGHBORHOODS)}, {random.choice(CITIES)}"


def rand_name():
    if random.random() < 0.5:
        return random.choice(FIRST_NAMES_M), random.choice(LAST_NAMES)
    return random.choice(FIRST_NAMES_F), random.choice(LAST_NAMES)


def rand_dt_within(days_back):
    """A random timezone-aware datetime somewhere in the last `days_back` days."""
    now = timezone.now()
    delta_seconds = random.randint(0, days_back * 24 * 3600)
    return now - timedelta(seconds=delta_seconds)


def weighted_choice(pairs):
    """pairs: list of (value, weight)."""
    values, weights = zip(*pairs)
    return random.choices(values, weights=weights, k=1)[0]


def rand_order_note():
    """Freeform order note. Mostly blank (as real orders mostly are), some
    domain-specific instructions, and some generic filler via Faker so this
    doesn't need a hand-maintained list of throwaway sentences."""
    roll = random.random()
    if roll < 0.55:
        return ""
    if roll < 0.8:
        return random.choice([
            "Please handle with care, has delicate lace trim.",
            "Leave with the gate guard if I'm not home.",
            "Extra starch on the shirts please.",
            "Call before arriving.",
        ])
    return fake.sentence()


def rand_inventory_note():
    """Freeform inventory note — mostly blank, occasionally a real
    operational note, occasionally generic Faker filler for volume."""
    roll = random.random()
    if roll < 0.5:
        return ""
    if roll < 0.85:
        return random.choice([
            "Preferred supplier: Douala Wholesale Market",
            "Check expiry before restocking.",
            "Bulk discount available above 50 units.",
        ])
    return fake.sentence()


class Command(BaseCommand):
    help = "Seed the database with a small-laundromat dataset (1 owner, 3 employees). Safe to re-run."

    def add_arguments(self, parser):
        parser.add_argument("--customers", type=int, default=80, help="Number of customer users to create.")
        parser.add_argument("--staff", type=int, default=4, help="Number of staff users to create (1 owner + 3 employees).")
        parser.add_argument("--orders", type=int, default=400, help="Number of orders to create.")
        parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducible runs.")
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete existing rows from seedable tables before seeding. Destructive; no environment guard.",
        )
        parser.add_argument(
            "--clear-only", action="store_true",
            help="Delete existing rows from seedable tables and exit without reseeding. Destructive; no environment guard.",
        )
        parser.add_argument(
            "--days-back", type=int, default=90,
            help="Spread historical records over this many past days (default ~3 months).",
        )
        parser.add_argument(
            "--allow-production",
            action="store_true",
            help="Deprecated no-op, kept so existing command lines keep working.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Skip the 'already seeded' check and add another batch of random data on top.",
        )

    # -- helpers -------------------------------------------------------

    def backdate(self, model, instances, days_back, touch_updated=True):
        """Assign random historical created_at (and updated_at) to already-saved
        instances, then persist with bulk_update — bypassing auto_now[_add],
        which otherwise always forces 'now' on every save()/bulk_create()."""
        if not instances:
            return
        fields = ["created_at"]
        for obj in instances:
            created = rand_dt_within(days_back)
            obj.created_at = created
            if touch_updated:
                obj.updated_at = created + timedelta(minutes=random.randint(0, 600))
        if touch_updated:
            fields.append("updated_at")
        model.objects.bulk_update(instances, fields, batch_size=500)

    def log(self, msg):
        self.stdout.write(msg)

    def seed_staff_queryset(self):
        """Staff accounts created by this command (identified by the reserved domain)."""
        return User.objects.filter(is_staff=True, email__iendswith="@" + SEED_EMAIL_DOMAIN)

    def is_seeded(self):
        return self.seed_staff_queryset().exists()

    def seed_email(self, kind, index):
        # run_id keeps addresses unique across --force batches.
        return f"{kind}-{self.run_id}-{index}@{SEED_EMAIL_DOMAIN}"

    # -- main entrypoint -------------------------------------------------

    def handle(self, *args, **options):
        # With DEBUG off, seeded users get non-routable phones/emails and all
        # notifications disabled, so seed accounts can never message anyone real.
        production_seed = not settings.DEBUG

        if options["seed"] is not None:
            random.seed(options["seed"])
            fake.seed_instance(options["seed"])

        if options["clear"] or options["clear_only"]:
            self.clear_data()
            if options["clear_only"]:
                self.stdout.write(self.style.SUCCESS("Cleared seedable tables. Skipping reseed (--clear-only)."))
                return

        n_customers = options["customers"]
        n_staff = options["staff"]
        n_orders = options["orders"]
        days_back = options["days_back"]
        self.run_id = uuid.uuid4().hex[:8]

        settings.SEED_DATA_ACTIVE = True
        try:
            with transaction.atomic():
                # --- Idempotency gate -------------------------------------
                if self.is_seeded() and not options["force"]:
                    staff_users = list(self.seed_staff_queryset())
                    self.log(self.style.WARNING(
                        "Seed data already present — skipping users/orders/chat/finance. "
                        "Topping up reference data only."
                    ))
                    self.seed_reference_data(staff_users, days_back)
                    self.stdout.write(self.style.SUCCESS(
                        "Nothing else to do. Use --clear to rebuild "
                        "or --force to add another batch."
                    ))
                    return

                # --- Password (only needed once we actually create users) --
                seed_password = os.environ.get("SEED_USER_PASSWORD", "")
                if production_seed and len(seed_password) < 12:
                    raise CommandError(
                        "Set SEED_USER_PASSWORD to at least 12 characters before production seeding."
                    )
                if not seed_password:
                    seed_password = "Password123!"

                used_phones = set(User.objects.values_list("phone_number", flat=True))

                staff_users = self.seed_staff(
                    n_staff, used_phones, seed_password, production_seed
                )
                customers = self.seed_customers(
                    n_customers, used_phones, days_back, seed_password, production_seed
                )
                self.seed_notification_preferences(
                    staff_users + customers, production_seed
                )
                promo_codes, _items = self.seed_reference_data(staff_users, days_back)
                payment_methods = self.seed_payment_methods(customers, production_seed)
                orders = self.seed_orders(
                    n_orders, customers, staff_users, promo_codes, payment_methods, days_back
                )
                self.seed_chat(customers, staff_users, orders, days_back)
                self.seed_subscriptions(customers, days_back)
                self.seed_credit(customers, staff_users, orders, days_back)
                total_revenue = Payment.objects.filter(
                    status=PaymentStatus.SUCCEEDED
                ).aggregate(total=Sum("amount"))["total"] or Decimal(0)
                self.seed_expenses(staff_users, days_back, total_revenue)
                self.seed_staff_invites(
                    staff_users, used_phones, days_back, production_seed
                )
        finally:
            settings.SEED_DATA_ACTIVE = False

        self.print_summary()

    # -- reference data (idempotent, natural-keyed) ---------------------

    def seed_reference_data(self, staff_users, days_back):
        """Everything with a fixed identity. Safe to call any number of times."""
        promo_codes = self.seed_promo_codes(days_back)
        self.seed_loyalty_rules()
        self.seed_discount_campaigns(days_back)
        items = self.seed_inventory(staff_users, days_back)
        return promo_codes, items

    # -- clearing ---------------------------------------------------------

    def clear_data(self):
        self.log(self.style.WARNING("Clearing existing seedable data..."))
        MessageAttachment.objects.all().delete()
        Message.objects.all().delete()
        ChatRoom.objects.all().delete()
        Notification.objects.all().delete()
        NotificationPreference.objects.all().delete()
        PromoUsage.objects.all().delete()
        LoyaltyTransaction.objects.all().delete()
        PromoCode.objects.all().delete()
        LoyaltyRule.objects.all().delete()
        DiscountCampaign.objects.all().delete()
        Refund.objects.all().delete()
        Invoice.objects.all().delete()
        Payment.objects.all().delete()
        PaymentMethod.objects.all().delete()
        Subscription.objects.all().delete()
        PickupDeliverySchedule.objects.all().delete()
        OrderStatusHistory.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.all_objects.all().delete()
        CreditTransaction.objects.all().delete()
        CreditAccount.objects.all().delete()
        Expense.objects.all().delete()
        PayrollEntry.objects.all().delete()
        InventoryTransaction.objects.all().delete()
        InventoryItem.objects.all().delete()
        StaffActivityLog.objects.all().delete()
        StaffInvite.objects.all().delete()
        StaffProfile.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    # -- users --------------------------------------------------------

    def seed_staff(self, n_staff, used_phones, seed_password, production_seed):
        self.log(f"Creating {n_staff} staff users...")
        # Default shop: the owner (MANAGER) plus three employees. Extra staff
        # (if --staff is raised) are attendants.
        roles = [StaffRole.MANAGER, StaffRole.ATTENDANT, StaffRole.ATTENDANT, StaffRole.CASHIER]
        roles = roles[:n_staff]
        while len(roles) < n_staff:
            roles.append(StaffRole.ATTENDANT)

        staff_users = []
        for i, role in enumerate(roles[:n_staff]):
            first, last = rand_name()
            phone = rand_test_phone(used_phones) if production_seed else rand_phone(used_phones)
            user = User.objects.create_user(
                phone_number=phone,
                password=seed_password,
                email=self.seed_email("staff", i),
                first_name=first,
                last_name=last,
                is_staff=True,
                is_phone_verified=True,
            )
            staff_users.append(user)

        # StaffProfile creation triggers StaffActivityLog via signal automatically.
        for user, role in zip(staff_users, roles[:n_staff]):
            StaffProfile.objects.create(
                user=user,
                role=role,
                is_active=True,
                invited_by=None,
            )

        # Give staff sensible profile info too (signal already made blank UserProfile/LoyaltyAccount).
        profiles = []
        for user in staff_users:
            profile = user.profile
            profile.city = random.choice(CITIES)
            profile.address_line = rand_address()
            if production_seed:
                profile.tags = ["seed-data", "owner-demo"]
            profiles.append(profile)
        UserProfile.objects.bulk_update(
            profiles, ["city", "address_line", "tags"], batch_size=200
        )

        return staff_users

    def seed_customers(
        self, n_customers, used_phones, days_back, seed_password, production_seed
    ):
        self.log(f"Creating {n_customers} customer users...")
        customers = []
        for i in range(n_customers):
            first, last = rand_name()
            phone = rand_test_phone(used_phones) if production_seed else rand_phone(used_phones)
            has_email = production_seed or random.random() < 0.55
            user = User.objects.create_user(
                phone_number=phone,
                password=seed_password,
                email=self.seed_email("customer", i) if has_email else None,
                first_name=first,
                last_name=last,
                is_phone_verified=random.random() < 0.85,
            )
            customers.append(user)

        self.backdate(User, customers, days_back)

        profiles = []
        loyalty_accounts = []
        for user in customers:
            profile = user.profile
            profile.city = random.choice(CITIES)
            profile.address_line = rand_address()
            profile.preferred_language = weighted_choice([("en", 6), ("fr", 4)])
            if production_seed:
                profile.tags = ["seed-data", "owner-demo"]
            if random.random() < 0.4:
                start = date(1965, 1, 1).toordinal()
                end = date(2006, 1, 1).toordinal()
                profile.date_of_birth = date.fromordinal(random.randint(start, end))
            profiles.append(profile)

            loyalty = user.loyalty_account
            lifetime = random.choice([0, 0, 0, 50, 120, 300, 600, 1200, 2500, 5000])
            spent_frac = random.uniform(0, 0.7)
            loyalty.lifetime_points_earned = lifetime
            loyalty.points_balance = int(lifetime * (1 - spent_frac))
            if lifetime >= 2000:
                loyalty.tier = LoyaltyAccount.Tier.GOLD
            elif lifetime >= 500:
                loyalty.tier = LoyaltyAccount.Tier.SILVER
            else:
                loyalty.tier = LoyaltyAccount.Tier.BRONZE
            loyalty_accounts.append(loyalty)

        UserProfile.objects.bulk_update(
            profiles,
            ["city", "address_line", "preferred_language", "date_of_birth", "tags"],
            batch_size=300,
        )
        LoyaltyAccount.objects.bulk_update(
            loyalty_accounts, ["lifetime_points_earned", "points_balance", "tier"], batch_size=300
        )

        return customers

    def seed_notification_preferences(self, users, production_seed=False):
        # Skip anyone who already has a row (OneToOne safe).
        existing = set(
            NotificationPreference.objects.filter(user__in=users).values_list("user_id", flat=True)
        )
        users = [u for u in users if u.pk not in existing]
        self.log(f"Creating notification preferences for {len(users)} users...")
        prefs = [
            NotificationPreference(
                user=u,
                sms_enabled=False if production_seed else random.random() < 0.9,
                email_enabled=False if production_seed else random.random() < 0.6,
                push_enabled=False if production_seed else random.random() < 0.75,
                promo_opt_in=False if production_seed else random.random() < 0.65,
            )
            for u in users
        ]
        NotificationPreference.objects.bulk_create(prefs, batch_size=300)

    # -- discounts / loyalty program setup --------------------------------

    def seed_promo_codes(self, days_back):
        """Create any missing seed promo codes (keyed on `code`). Returns all seed codes."""
        now = timezone.now()
        existing = set(
            PromoCode.objects.filter(code__in=SEED_PROMO_CODE_NAMES).values_list("code", flat=True)
        )
        codes = []
        for code, dtype, value in SEED_PROMO_CODES:
            if code in existing:
                continue
            codes.append(PromoCode(
                code=code,
                description=f"{value}{'%' if dtype == DiscountType.PERCENTAGE else ' XAF'} off",
                discount_type=dtype,
                value=value,
                min_order_amount=Decimal(random.choice([0, 1000, 2000, 5000])),
                max_uses=random.choice([None, 20, 50]),
                max_uses_per_user=random.choice([1, 1, 2, 3]),
                valid_from=now - timedelta(days=random.randint(10, days_back)),
                valid_until=now + timedelta(days=random.randint(10, 120)),
                is_active=random.random() < 0.85,
            ))
        # A couple of expired/extra codes so expiry handling is exercised.
        for i, code in enumerate(EXTRA_PROMO_CODES):
            if code in existing:
                continue
            dtype = random.choice(list(DiscountType))
            value = Decimal(random.choice([5, 10, 12, 15, 300, 500, 750])) if dtype == DiscountType.PERCENTAGE \
                else Decimal(random.choice([300, 500, 750, 1000, 1500]))
            codes.append(PromoCode(
                code=code,
                description="Auto-generated promotional code",
                discount_type=dtype,
                value=value,
                min_order_amount=Decimal(random.choice([0, 500, 1000])),
                max_uses=random.choice([None, 20, 50]),
                max_uses_per_user=1,
                valid_from=now - timedelta(days=random.randint(10, days_back)),
                valid_until=now - timedelta(days=random.randint(1, 5)) if i == 0 else now + timedelta(days=60),
                is_active=i != 0,
            ))
        if codes:
            self.log(f"Creating {len(codes)} promo codes...")
            PromoCode.objects.bulk_create(codes, batch_size=100)
        else:
            self.log("Promo codes already present.")
        return list(PromoCode.objects.filter(code__in=SEED_PROMO_CODE_NAMES))

    def seed_loyalty_rules(self):
        rules = [
            dict(name="Standard earning rate", points_per_currency_unit=Decimal("0.0100"),
                 min_spend=Decimal("0"), is_active=True),
            dict(name="Gold tier bonus rate", points_per_currency_unit=Decimal("0.0150"),
                 min_spend=Decimal("5000"), is_active=True),
            dict(name="Weekend double points", points_per_currency_unit=Decimal("0.0200"),
                 min_spend=Decimal("2000"), is_active=False),
        ]
        created = 0
        for rule in rules:
            _, was_created = LoyaltyRule.objects.get_or_create(
                name=rule["name"],
                defaults={k: v for k, v in rule.items() if k != "name"},
            )
            created += was_created
        self.log(f"Loyalty rules: {created} created, {len(rules) - created} already present.")

    def seed_discount_campaigns(self, days_back):
        now = timezone.now()
        existing = set(
            DiscountCampaign.objects.filter(name__in=SEED_CAMPAIGN_NAMES).values_list("name", flat=True)
        )
        campaigns = []
        segments = list(DiscountCampaign.Segment)
        for name in SEED_CAMPAIGN_NAMES:
            if name in existing:
                continue
            dtype = random.choice(list(DiscountType))
            value = Decimal(random.choice([10, 15, 20, 25])) if dtype == DiscountType.PERCENTAGE \
                else Decimal(random.choice([500, 1000, 1500, 2000]))
            start = now - timedelta(days=random.randint(0, days_back))
            campaigns.append(DiscountCampaign(
                name=name,
                description=f"Promotional campaign: {name}",
                discount_type=dtype,
                value=value,
                target_segment=random.choice(segments),
                start_date=start,
                end_date=start + timedelta(days=random.randint(7, 30)),
                is_active=random.random() < 0.5,
            ))
        if campaigns:
            self.log(f"Creating {len(campaigns)} discount campaigns...")
            DiscountCampaign.objects.bulk_create(campaigns, batch_size=50)
        else:
            self.log("Discount campaigns already present.")

    # -- inventory ----------------------------------------------------

    def seed_inventory(self, staff_users, days_back):
        """Create any missing inventory items (keyed on `name`) plus a short
        transaction history for each newly created item only."""
        names = [name for name, _c, _u in INVENTORY_ITEMS]
        existing = set(InventoryItem.objects.filter(name__in=names).values_list("name", flat=True))

        new_items = []
        for name, category, unit in INVENTORY_ITEMS:
            if name in existing:
                continue
            qty = Decimal(random.randint(5, 80))
            new_items.append(InventoryItem(
                name=name, category=category, unit=unit, quantity=qty,
                low_stock_threshold=Decimal(random.randint(3, 15)),
                notes=rand_inventory_note(),
            ))

        if not new_items:
            self.log("Inventory items already present.")
            return list(InventoryItem.objects.filter(name__in=names))

        self.log(f"Creating {len(new_items)} inventory items and transactions...")
        InventoryItem.objects.bulk_create(new_items)
        created_items = list(InventoryItem.objects.filter(name__in=[i.name for i in new_items]))

        transactions = []
        for item in created_items:
            for _ in range(random.randint(3, 8)):
                change_type = weighted_choice([
                    (InventoryTransaction.ChangeType.RESTOCK, 3),
                    (InventoryTransaction.ChangeType.USAGE, 6),
                    (InventoryTransaction.ChangeType.ADJUSTMENT, 1),
                ])
                if change_type == InventoryTransaction.ChangeType.RESTOCK:
                    qty_change = Decimal(random.randint(5, 50))
                    reason = "Delivery received from supplier"
                elif change_type == InventoryTransaction.ChangeType.USAGE:
                    qty_change = -Decimal(random.randint(1, 10))
                    reason = "Consumed in daily operations"
                else:
                    qty_change = Decimal(random.choice([-5, -2, -1, 1, 2, 5]))
                    reason = "Stocktake correction"
                transactions.append(InventoryTransaction(
                    item=item, change_type=change_type, quantity_change=qty_change,
                    reason=reason, created_by=random.choice(staff_users),
                ))
        InventoryTransaction.objects.bulk_create(transactions, batch_size=500)
        self.backdate(InventoryTransaction, transactions, days_back, touch_updated=False)
        return list(InventoryItem.objects.filter(name__in=names))

    # -- payment methods ------------------------------------------------

    def seed_payment_methods(self, customers, production_seed=False):
        self.log("Creating payment methods...")
        methods = []
        by_user = {}
        for user in customers:
            n = random.choice([0, 1, 1, 2])
            user_methods = []
            for i in range(n):
                gateway = random.choice(list(PaymentGateway))
                phone_number = ""
                if gateway in (PaymentGateway.MTN_MOMO, PaymentGateway.ORANGE_MONEY):
                    phone_number = (
                        user.phone_number
                        if production_seed
                        else f"237{random.choice(['65', '67', '69'])}"
                        f"{random.randint(1000000, 9999999)}"
                    )
                pm = PaymentMethod(
                    user=user,
                    gateway=gateway,
                    phone_number=phone_number,
                    display_label=generate_display_label(gateway, phone_number),
                    provider_token=f"tok_{random.randint(10**8, 10**9)}" if gateway == PaymentGateway.STRIPE else "",
                    is_default=(i == 0),
                )
                user_methods.append(pm)
                methods.append(pm)
            by_user[user.pk] = user_methods
        PaymentMethod.objects.bulk_create(methods, batch_size=300)
        return by_user

    # -- orders -----------------------------------------------------------

    def seed_orders(self, n_orders, customers, staff_users, promo_codes, payment_methods, days_back):
        self.log(f"Creating {n_orders} orders (this is the heavy part)...")
        active_promo_codes = [p for p in promo_codes if p.is_active]
        status_weights = [
            (OrderStatus.DELIVERED, 55),
            (OrderStatus.CANCELLED, 8),
            (OrderStatus.OUT_FOR_DELIVERY, 6),
            (OrderStatus.READY, 8),
            (OrderStatus.IN_PROGRESS, 10),
            (OrderStatus.CONFIRMED, 8),
            (OrderStatus.PENDING, 5),
        ]

        orders = []
        all_order_items = []
        all_schedules = []
        all_payments = []
        all_refunds = []
        all_loyalty_txns = []
        all_promo_usages = []

        for i in range(n_orders):
            customer = random.choice(customers)
            final_status = weighted_choice(status_weights)
            order_dt = rand_dt_within(days_back)

            order = Order.objects.create(
                user=customer,
                status=OrderStatus.PENDING,  # start pending; walk it forward below
                pickup_address=rand_address(),
                delivery_address=rand_address(),
                notes=rand_order_note(),
                currency=Currency.XAF,
            )

            # Build 1-3 line items for this order.
            n_items = random.randint(1, 3)
            order_items = []
            subtotal = Decimal(0)
            for _ in range(n_items):
                label, service_type = random.choice(ITEM_LABELS)
                weight = Decimal(str(round(random.uniform(1.0, 8.0), 2)))
                quantity = random.randint(1, 3)
                unit_price = Decimal(random.choice([500, 750, 1000, 1250, 1500, 2000]))
                item_subtotal = unit_price * quantity
                subtotal += item_subtotal
                order_items.append(OrderItem(
                    order=order, service_type=service_type, label=label,
                    description=random.choice(["", "", "Stain on sleeve.", "Missing a button."]),
                    weight_kg=weight, quantity=quantity, unit_price=unit_price, subtotal=item_subtotal,
                ))
            OrderItem.objects.bulk_create(order_items)
            all_order_items.extend(order_items)

            # Maybe apply a promo code.
            discount_amount = Decimal(0)
            applied_promo = None
            if active_promo_codes and random.random() < 0.22 and final_status != OrderStatus.CANCELLED:
                promo = random.choice(active_promo_codes)
                if subtotal >= promo.min_order_amount:
                    if promo.discount_type == DiscountType.PERCENTAGE:
                        discount_amount = (subtotal * promo.value / Decimal(100)).quantize(Decimal("1"))
                    else:
                        discount_amount = min(promo.value, subtotal)
                    applied_promo = promo

            delivery_fee = Decimal(random.choice([0, 500, 1000, 1500]))
            order.subtotal = subtotal
            order.discount_amount = discount_amount
            order.delivery_fee = delivery_fee
            order.total_amount = subtotal + delivery_fee - discount_amount
            order.status = final_status
            order.save(update_fields=["subtotal", "discount_amount", "delivery_fee", "total_amount", "status"])

            if applied_promo:
                all_promo_usages.append(PromoUsage(
                    promo_code=applied_promo, user=customer, order=order, discount_applied=discount_amount,
                ))

            # Schedule.
            pickup_date = order_dt.date()
            delivery_date = pickup_date + timedelta(days=random.randint(1, 3))
            if final_status == OrderStatus.DELIVERED:
                pickup_status = PickupDeliverySchedule.Status.COMPLETED
                delivery_status = PickupDeliverySchedule.Status.COMPLETED
            elif final_status == OrderStatus.CANCELLED:
                pickup_status = random.choice(
                    [PickupDeliverySchedule.Status.MISSED, PickupDeliverySchedule.Status.SCHEDULED]
                )
                delivery_status = PickupDeliverySchedule.Status.SCHEDULED
            else:
                pickup_status = PickupDeliverySchedule.Status.COMPLETED
                delivery_status = PickupDeliverySchedule.Status.SCHEDULED
            schedule = PickupDeliverySchedule(
                order=order,
                pickup_date=pickup_date,
                pickup_time_slot=random.choice(list(PickupDeliverySchedule.TimeSlot)),
                pickup_status=pickup_status,
                delivery_date=delivery_date,
                delivery_time_slot=random.choice(list(PickupDeliverySchedule.TimeSlot)),
                delivery_status=delivery_status,
                driver_notes=random.choice(["", "", "Gate code #1234.", "Third floor, no elevator."]),
            )
            all_schedules.append(schedule)

            # Payment.
            user_methods = payment_methods.get(customer.pk) or []
            method = random.choice(user_methods) if user_methods else None
            gateway = method.gateway if method else random.choice(list(PaymentGateway))
            if final_status == OrderStatus.CANCELLED:
                pay_status = weighted_choice([
                    (PaymentStatus.FAILED, 5), (PaymentStatus.REFUNDED, 3), (PaymentStatus.PENDING, 2),
                ])
            elif final_status == OrderStatus.PENDING:
                pay_status = weighted_choice([(PaymentStatus.PENDING, 6), (PaymentStatus.SUCCEEDED, 2)])
            else:
                pay_status = weighted_choice([
                    (PaymentStatus.SUCCEEDED, 9), (PaymentStatus.PARTIALLY_REFUNDED, 1),
                ])
            payment = Payment(
                order=order, method=method, gateway=gateway,
                gateway_reference=f"TXN{random.randint(10**9, 10**10)}",
                amount=order.total_amount, currency=Currency.XAF, status=pay_status,
                paid_at=order_dt if pay_status == PaymentStatus.SUCCEEDED else None,
                failure_reason="Insufficient balance" if pay_status == PaymentStatus.FAILED else "",
            )
            all_payments.append(payment)

            orders.append((order, order_dt, payment, final_status, customer))

        # Bulk-save payments, then link invoices/refunds using their real pks.
        Payment.objects.bulk_create(all_payments, batch_size=500)

        for (order, order_dt, payment, final_status, customer) in orders:
            if payment.status in (PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED, PaymentStatus.REFUNDED) \
                    and random.random() < 0.07:
                refund_amount = (payment.amount * Decimal(random.choice(["0.25", "0.5", "1"]))).quantize(Decimal("1"))
                all_refunds.append(Refund(
                    payment=payment,
                    amount=refund_amount,
                    reason=random.choice([
                        "Item damaged during processing.", "Customer cancelled after pickup.",
                        "Duplicate charge.", "Service quality complaint.",
                    ]),
                    status=weighted_choice([
                        (Refund.Status.PROCESSED, 5), (Refund.Status.APPROVED, 2),
                        (Refund.Status.PENDING, 2), (Refund.Status.REJECTED, 1),
                    ]),
                    processed_by=random.choice(staff_users),
                ))
            if final_status == OrderStatus.DELIVERED:
                loyalty = customer.loyalty_account
                points = int(order.total_amount * Decimal("0.01"))
                if points > 0:
                    all_loyalty_txns.append(LoyaltyTransaction(
                        loyalty_account=loyalty, points=points,
                        transaction_type=LoyaltyTransaction.TransactionType.EARN,
                        order=order, note="Points earned on delivered order",
                    ))

        PickupDeliverySchedule.objects.bulk_create(all_schedules, batch_size=500)
        # Order creation already creates the one-to-one invoice through the
        # payment reconciliation service. Update those records instead of
        # attempting to insert a duplicate invoice for the same order.
        invoices_by_order = {
            invoice.order_id: invoice
            for invoice in Invoice.objects.filter(order__in=[item[0] for item in orders])
        }
        invoice_updates = []
        for order, _order_dt, payment, _final_status, _customer in orders:
            invoice = invoices_by_order[order.pk]
            invoice.amount_due = order.total_amount
            invoice.amount_paid = (
                payment.amount
                if payment.status
                in (PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED)
                else Decimal(0)
            )
            invoice_updates.append(invoice)
        Invoice.objects.bulk_update(
            invoice_updates, ["amount_due", "amount_paid"], batch_size=500
        )
        Refund.objects.bulk_create(all_refunds, batch_size=500)
        PromoUsage.objects.bulk_create(all_promo_usages, batch_size=500)
        LoyaltyTransaction.objects.bulk_create(all_loyalty_txns, batch_size=500)

        # Notifications for a good chunk of orders.
        notifications = []
        for (order, order_dt, payment, final_status, customer) in orders:
            for _ in range(random.randint(1, 3)):
                ntype = weighted_choice([
                    (Notification.NotificationType.ORDER_UPDATE, 6),
                    (Notification.NotificationType.PAYMENT, 3),
                    (Notification.NotificationType.PROMO, 1),
                    (Notification.NotificationType.SYSTEM, 1),
                ])
                title, body = random.choice(NOTIFICATION_TEMPLATES[ntype])
                is_read = random.random() < 0.7
                notifications.append(Notification(
                    user=customer, notification_type=ntype,
                    title=title, body=body.format(ref=order.pk),
                    is_read=is_read,
                    read_at=order_dt + timedelta(minutes=random.randint(1, 500)) if is_read else None,
                    related_order=order,
                ))
        # Extra standalone system/promo notifications unrelated to any single order.
        all_users_for_notifs = customers
        notif_sample_k = min(len(all_users_for_notifs), max(1, n_orders // 6)) if all_users_for_notifs else 0
        for user in (random.sample(all_users_for_notifs, k=notif_sample_k) if notif_sample_k else []):
            ntype = random.choice([Notification.NotificationType.PROMO, Notification.NotificationType.SYSTEM])
            title, body = random.choice(NOTIFICATION_TEMPLATES[ntype])
            notifications.append(Notification(
                user=user, notification_type=ntype, title=title, body=body,
                is_read=random.random() < 0.5,
            ))
        Notification.objects.bulk_create(notifications, batch_size=500)

        # Backdate everything to spread naturally across the timeline.
        order_objs = [o for (o, _dt, _p, _s, _c) in orders]
        for obj, (o, dt, p, s, c) in zip(order_objs, orders):
            obj.created_at = dt
            obj.updated_at = dt + timedelta(hours=random.randint(0, 72))
        Order.all_objects.bulk_update(order_objs, ["created_at", "updated_at"], batch_size=500)

        self.backdate(OrderItem, all_order_items, days_back, touch_updated=False)
        self.backdate(PickupDeliverySchedule, all_schedules, days_back, touch_updated=False)
        self.backdate(Payment, all_payments, days_back, touch_updated=False)
        self.backdate(Invoice, invoice_updates, days_back, touch_updated=False)
        self.backdate(Refund, all_refunds, days_back, touch_updated=False)
        self.backdate(LoyaltyTransaction, all_loyalty_txns, days_back, touch_updated=False)
        self.backdate(PromoUsage, all_promo_usages, days_back, touch_updated=False)
        self.backdate(Notification, notifications, days_back, touch_updated=False)

        # Roll up loyalty point totals after the EARN transactions above.
        touched_accounts = {}
        for txn in all_loyalty_txns:
            acc = touched_accounts.setdefault(txn.loyalty_account_id, txn.loyalty_account)
            acc.points_balance = (acc.points_balance or 0) + txn.points
            acc.lifetime_points_earned = (acc.lifetime_points_earned or 0) + txn.points
        if touched_accounts:
            LoyaltyAccount.objects.bulk_update(
                list(touched_accounts.values()), ["points_balance", "lifetime_points_earned"], batch_size=300
            )

        return order_objs

    # -- chat ---------------------------------------------------------

    def seed_chat(self, customers, staff_users, orders, days_back):
        self.log("Creating chat rooms and messages...")
        rooms = []
        # Order-linked support chats for a slice of orders.
        for order in (random.sample(orders, k=min(len(orders), max(1, len(orders) // 20))) if orders else []):
            rooms.append(ChatRoom(
                customer=order.user, agent=random.choice(staff_users), order=order,
                status=random.choice(list(ChatRoom.Status)),
            ))
        # Standalone general-support chats.
        for _ in range(max(5, len(customers) // 10)):
            rooms.append(ChatRoom(
                customer=random.choice(customers),
                agent=random.choice(staff_users) if random.random() < 0.9 else None,
                order=None,
                status=random.choice(list(ChatRoom.Status)),
            ))
        ChatRoom.objects.bulk_create(rooms, batch_size=300)
        self.backdate(ChatRoom, rooms, days_back)

        messages = []
        for room in rooms:
            n_messages = random.randint(2, 6)
            for i in range(n_messages):
                is_customer_turn = i % 2 == 0
                sender = room.customer if is_customer_turn or not room.agent else room.agent
                content = random.choice(CHAT_CUSTOMER_LINES) if is_customer_turn else random.choice(CHAT_AGENT_LINES)
                messages.append(Message(
                    room=room, sender=sender, content=content,
                    read_at=timezone.now() if random.random() < 0.6 else None,
                ))
        Message.objects.bulk_create(messages, batch_size=500)
        self.backdate(Message, messages, days_back, touch_updated=False)

        attachments = []
        attach_k = min(len(messages), max(1, len(messages) // 15)) if messages else 0
        for message in (random.sample(messages, k=attach_k) if attach_k else []):
            fname = random.choice(["stain_photo.jpg", "before.jpg", "after.jpg", "receipt.pdf", "item_tag.jpg"])
            attachments.append(MessageAttachment(
                message=message,
                file=f"chat_attachments/seed/{fname}",
                file_name=fname,
                content_type="image/jpeg" if fname.endswith("jpg") else "application/pdf",
            ))
        MessageAttachment.objects.bulk_create(attachments, batch_size=300)

    # -- subscriptions ------------------------------------------------

    def seed_subscriptions(self, customers, days_back):
        self.log("Creating subscriptions...")
        subs = []
        sub_k = min(len(customers), max(1, len(customers) // 3)) if customers else 0
        for user in (random.sample(customers, k=sub_k) if sub_k else []):
            plan = random.choice(list(Subscription.Plan))
            status = weighted_choice([
                (Subscription.Status.ACTIVE, 6), (Subscription.Status.PAUSED, 2),
                (Subscription.Status.CANCELLED, 1), (Subscription.Status.EXPIRED, 1),
            ])
            start = date.today() - timedelta(days=random.randint(5, days_back))
            subs.append(Subscription(
                user=user, plan=plan, status=status,
                kg_remaining=Decimal(str(round(random.uniform(0, float(kg_allowance_for_plan(plan))), 2))),
                start_date=start, end_date=start + timedelta(days=30 * random.randint(1, 6)),
            ))
        Subscription.objects.bulk_create(subs, batch_size=300)
        self.backdate(Subscription, subs, days_back)

    # -- finance --------------------------------------------------------

    def seed_credit(self, customers, staff_users, orders, days_back):
        self.log("Creating credit accounts and transactions...")
        credit_k = min(len(customers), max(1, len(customers) // 4)) if customers else 0
        credit_customers = random.sample(customers, k=credit_k) if credit_k else []
        if not credit_customers:
            return
        accounts = [CreditAccount(user=u, balance=Decimal(0), credit_limit=Decimal(random.choice([0, 5000, 10000, 20000])))
                    for u in credit_customers]
        CreditAccount.objects.bulk_create(accounts)
        accounts = {a.user_id: a for a in CreditAccount.objects.filter(user__in=credit_customers)}

        orders_by_user = {}
        for order in orders:
            orders_by_user.setdefault(order.user_id, []).append(order)

        created_txns = []
        for user in credit_customers:
            account = accounts[user.pk]
            n_txns = random.randint(1, 6)
            for _ in range(n_txns):
                ttype = weighted_choice([
                    (CreditTransaction.TransactionType.CHARGE, 5),
                    (CreditTransaction.TransactionType.PAYMENT, 4),
                    (CreditTransaction.TransactionType.ADJUSTMENT, 1),
                ])
                linked_order = random.choice(orders_by_user[user.pk]) if orders_by_user.get(user.pk) and random.random() < 0.5 else None
                if ttype == CreditTransaction.TransactionType.ADJUSTMENT:
                    amount = Decimal(random.choice([-1000, -500, 500, 1000]))
                else:
                    amount = Decimal(random.choice([500, 1000, 1500, 2000, 3000, 5000]))
                # Created one at a time — the post_save signal keeps CreditAccount.balance in sync.
                txn = CreditTransaction.objects.create(
                    credit_account=account, transaction_type=ttype, amount=amount,
                    order=linked_order,
                    note=random.choice(["", "Phone follow-up confirmed.", "Paid in person at shop."]),
                    created_by=random.choice(staff_users),
                )
                created_txns.append(txn)
        # Only backdate rows this run created (not every credit txn in the DB).
        self.backdate(CreditTransaction, created_txns, days_back, touch_updated=False)

    def seed_expenses(self, staff_users, days_back, total_revenue):
        """Expenses follow realistic business cadence instead of being drawn
        as 700 flat random records: rent is once a month, salaries are once
        per staff member a month, and everything else happens more often but
        in smaller amounts. The whole batch is then scaled so its total lands
        at a believable profit margin against the revenue seed_orders
        actually generated, rather than two disconnected random processes
        landing wherever chance takes them (which is what produced dashboards
        showing expenses several times larger than revenue)."""
        self.log("Creating expenses...")
        now = timezone.now()
        months_back = max(1, days_back // 30)

        def rand_date_in_month(month_end):
            offset = random.randint(0, 29)
            return (month_end - timedelta(days=offset)).date()

        expenses = []
        for m in range(months_back):
            month_end = now - timedelta(days=30 * m)
            pay_period = month_end.date().replace(day=1)

            def add(category, lo, hi):
                expenses.append(Expense(
                    category=category, amount=Decimal(random.randint(lo, hi)), currency=Currency.XAF,
                    date=rand_date_in_month(month_end), notes=random.choice(EXPENSE_NOTES[category]),
                    created_by=random.choice(staff_users),
                ))

            # Rent: one charge a month.
            add(ExpenseCategory.RENT, 100000, 200000)

            # Payroll is a dedicated ledger, not a generic expense category.
            # Keyed on (employee, pay_period) so a rerun never double-pays a month.
            for employee in staff_users:
                PayrollEntry.objects.get_or_create(
                    employee=employee,
                    pay_period=pay_period,
                    defaults=dict(
                        amount=Decimal(random.randint(60000, 120000)),
                        currency=Currency.XAF,
                        status=PayrollEntry.Status.PAID,
                        paid_on=rand_date_in_month(month_end),
                        notes=random.choice(["Monthly salary", "Salary and overtime", "Salary and performance bonus"]),
                        created_by=random.choice(staff_users),
                    ),
                )

            # Utilities: a couple of bills a month.
            for _ in range(random.randint(1, 3)):
                add(ExpenseCategory.UTILITIES, 15000, 45000)

            # Supplies: restocking happens fairly often.
            for _ in range(random.randint(1, 3)):
                add(ExpenseCategory.SUPPLIES, 8000, 40000)

            # Maintenance: occasional repairs.
            for _ in range(random.randint(0, 2)):
                add(ExpenseCategory.MAINTENANCE, 5000, 80000)

            # Other: small odds and ends.
            for _ in range(random.randint(1, 2)):
                add(ExpenseCategory.OTHER, 2000, 15000)

        # Scale the batch so total expenses sit at a believable fraction of
        # actual seeded revenue (a 25-45% profit margin), instead of the
        # category ranges above determining the total on their own.
        raw_total = sum((e.amount for e in expenses), Decimal(0))
        if raw_total > 0 and total_revenue > 0:
            target_ratio = Decimal(str(round(random.uniform(0.55, 0.75), 3)))
            scale = (total_revenue * target_ratio) / raw_total
            for e in expenses:
                e.amount = (e.amount * scale).quantize(Decimal("1"))

        Expense.objects.bulk_create(expenses, batch_size=500)
        self.backdate(Expense, expenses, days_back, touch_updated=False)

    # -- staff invites --------------------------------------------------

    def seed_staff_invites(self, staff_users, used_phones, days_back, production_seed):
        self.log("Creating staff invites...")
        invites = []
        for _ in range(2):
            first, last = rand_name()
            phone = rand_test_phone(used_phones) if production_seed else rand_phone(used_phones)
            status = weighted_choice([
                (StaffInvite.Status.ACCEPTED, 4), (StaffInvite.Status.PENDING, 3),
                (StaffInvite.Status.EXPIRED, 2), (StaffInvite.Status.REVOKED, 1),
            ])
            invites.append(StaffInvite(
                phone_number=phone, full_name=f"{first} {last}",
                role=random.choice(list(StaffRole)), status=status,
                invited_by=random.choice(staff_users),
                accepted_by=random.choice(staff_users) if status == StaffInvite.Status.ACCEPTED else None,
            ))
        StaffInvite.objects.bulk_create(invites, batch_size=100)
        self.backdate(StaffInvite, invites, days_back)

        # Extra freeform activity log entries, beyond the automatic ones from
        # StaffProfile creation, so the audit trail looks like a real shop.
        actions = [
            ("order_status_changed", "Marked order as delivered"),
            ("promo_created", "Created a new promo code"),
            ("inventory_restocked", "Logged a supply restock"),
            ("refund_processed", "Processed a customer refund"),
            ("expense_logged", "Recorded a new expense"),
            ("role_changed", "Updated a staff member's role"),
            ("customer_contacted", "Called a customer about a delayed order"),
        ]
        logs = []
        for _ in range(150):
            action, description = random.choice(actions)
            logs.append(StaffActivityLog(staff=random.choice(staff_users), action=action, description=description))
        StaffActivityLog.objects.bulk_create(logs, batch_size=500)
        self.backdate(StaffActivityLog, logs, days_back, touch_updated=False)

    # -- summary ----------------------------------------------------------

    def print_summary(self):
        self.stdout.write(self.style.SUCCESS("\nSeed complete. Row counts:"))
        rows = [
            ("Users", User.objects.count()),
            ("Staff profiles", StaffProfile.objects.count()),
            ("Staff invites", StaffInvite.objects.count()),
            ("Staff activity logs", StaffActivityLog.objects.count()),
            ("Orders", Order.all_objects.count()),
            ("Order items", OrderItem.objects.count()),
            ("Order status history", OrderStatusHistory.objects.count()),
            ("Pickup/delivery schedules", PickupDeliverySchedule.objects.count()),
            ("Payments", Payment.objects.count()),
            ("Payment methods", PaymentMethod.objects.count()),
            ("Invoices", Invoice.objects.count()),
            ("Refunds", Refund.objects.count()),
            ("Subscriptions", Subscription.objects.count()),
            ("Promo codes", PromoCode.objects.count()),
            ("Promo usages", PromoUsage.objects.count()),
            ("Loyalty rules", LoyaltyRule.objects.count()),
            ("Loyalty transactions", LoyaltyTransaction.objects.count()),
            ("Discount campaigns", DiscountCampaign.objects.count()),
            ("Inventory items", InventoryItem.objects.count()),
            ("Inventory transactions", InventoryTransaction.objects.count()),
            ("Chat rooms", ChatRoom.objects.count()),
            ("Messages", Message.objects.count()),
            ("Message attachments", MessageAttachment.objects.count()),
            ("Notifications", Notification.objects.count()),
            ("Notification preferences", NotificationPreference.objects.count()),
            ("Credit accounts", CreditAccount.objects.count()),
            ("Credit transactions", CreditTransaction.objects.count()),
            ("Payroll entries", PayrollEntry.objects.count()),
            ("Expenses", Expense.objects.count()),
        ]
        width = max(len(label) for label, _ in rows)
        total = 0
        for label, count in rows:
            total += count
            self.stdout.write(f"  {label.ljust(width)} : {count:,}")
        self.stdout.write(self.style.SUCCESS(f"\nTotal rows across seeded tables: {total:,}"))