"""
Management command: seed_data

Fills the database with a large, realistic, interconnected dataset across
every app (users, orders, payments, discounts, finance, inventory, chat,
notifications, staff) so the app can be exercised under real-ish load —
pagination, filtering, dashboards, search, date-range reports, etc.

Usage
-----
    python manage.py seed_data
    python manage.py seed_data --customers 800 --orders 6000 --staff 20
    python manage.py seed_data --seed 42          # reproducible run
    python manage.py seed_data --clear            # wipe seedable tables, then reseed
    python manage.py seed_data --clear-only        # wipe seedable tables and exit

Only run this against a development/test database. `--clear` and
`--clear-only` refuse to run unless DEBUG=True as a basic guard rail against
pointing this at prod.
"""

import random
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
from apps.finance.models import CreditAccount, CreditTransaction, Expense, ExpenseCategory
from apps.inventory.models import InventoryCategory, InventoryItem, InventoryTransaction, InventoryUnit
from apps.notifications.models import Notification, NotificationPreference
from apps.orders.models.order import Order, OrderItem, OrderStatusHistory
from apps.orders.models.schedule import PickupDeliverySchedule
from apps.payments.models import Invoice, Payment, PaymentMethod, Refund, Subscription
from apps.staff.models import StaffActivityLog, StaffInvite, StaffProfile, StaffRole
from apps.users.models import LoyaltyAccount, UserProfile

from core.constants import Currency, OrderStatus, PaymentGateway, PaymentStatus, ServiceType
from services.pricing import kg_allowance_for_plan

User = get_user_model()

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
    ("Ariel Detergent Powder 2kg", InventoryCategory.DETERGENT, InventoryUnit.KG),
    ("Liquid Detergent (bulk)", InventoryCategory.DETERGENT, InventoryUnit.L),
    ("Downy Fabric Softener 1L", InventoryCategory.SOFTENER, InventoryUnit.L),
    ("Comfort Softener 2L", InventoryCategory.SOFTENER, InventoryUnit.L),
    ("Stain Remover Spray", InventoryCategory.DETERGENT, InventoryUnit.ML),
    ("Poly Garment Bags (100pc roll)", InventoryCategory.PACKAGING, InventoryUnit.PCS),
    ("Wire Hangers (bundle)", InventoryCategory.PACKAGING, InventoryUnit.PCS),
    ("Plastic Hangers (bundle)", InventoryCategory.PACKAGING, InventoryUnit.PCS),
    ("Garment Tags", InventoryCategory.PACKAGING, InventoryUnit.PCS),
    ("Laundry Twine", InventoryCategory.PACKAGING, InventoryUnit.PCS),
    ("Washing Machine Drive Belt", InventoryCategory.EQUIPMENT, InventoryUnit.PCS),
    ("Steam Iron", InventoryCategory.EQUIPMENT, InventoryUnit.PCS),
    ("Ironing Board Cover", InventoryCategory.EQUIPMENT, InventoryUnit.PCS),
    ("Dryer Lint Filter", InventoryCategory.EQUIPMENT, InventoryUnit.PCS),
    ("Industrial Sewing Thread", InventoryCategory.OTHER, InventoryUnit.PCS),
    ("Delivery Fuel Voucher", InventoryCategory.OTHER, InventoryUnit.PCS),
    ("Whitening Bleach 1L", InventoryCategory.DETERGENT, InventoryUnit.L),
    ("Starch Spray", InventoryCategory.DETERGENT, InventoryUnit.ML),
    ("Perfume Fragrance Booster", InventoryCategory.SOFTENER, InventoryUnit.ML),
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
    ExpenseCategory.SALARIES: [
        "Staff salaries", "Attendant overtime pay", "Driver bonus",
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
    help = "Seed the database with a large, heavily interconnected test dataset."

    def add_arguments(self, parser):
        parser.add_argument("--customers", type=int, default=350, help="Number of customer users to create.")
        parser.add_argument("--staff", type=int, default=14, help="Number of staff users to create.")
        parser.add_argument("--orders", type=int, default=1800, help="Number of orders to create.")
        parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducible runs.")
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete existing rows from seedable tables before seeding (requires DEBUG=True).",
        )
        parser.add_argument(
            "--clear-only", action="store_true",
            help="Delete existing rows from seedable tables and exit without reseeding (requires DEBUG=True).",
        )
        parser.add_argument(
            "--days-back", type=int, default=540,
            help="Spread historical records over this many past days (default ~18 months).",
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

    # -- main entrypoint -------------------------------------------------

    def handle(self, *args, **options):
        if options["seed"] is not None:
            random.seed(options["seed"])
            fake.seed_instance(options["seed"])

        if options["clear"] or options["clear_only"]:
            if not settings.DEBUG:
                raise CommandError("--clear/--clear-only refuse to run unless DEBUG=True. Point this at a dev/test DB only.")
            self.clear_data()
            if options["clear_only"]:
                self.stdout.write(self.style.SUCCESS("Cleared seedable tables. Skipping reseed (--clear-only)."))
                return

        n_customers = options["customers"]
        n_staff = options["staff"]
        n_orders = options["orders"]
        days_back = options["days_back"]

        used_phones = set(User.objects.values_list("phone_number", flat=True))

        with transaction.atomic():
            staff_users = self.seed_staff(n_staff, used_phones)
            customers = self.seed_customers(n_customers, used_phones, days_back)
            self.seed_notification_preferences(staff_users + customers)
            promo_codes = self.seed_promo_codes(days_back)
            self.seed_loyalty_rules()
            self.seed_discount_campaigns(days_back)
            inventory_items = self.seed_inventory(staff_users, days_back)
            payment_methods = self.seed_payment_methods(customers)
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
            self.seed_staff_invites(staff_users, used_phones, days_back)

        self.print_summary()

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
        InventoryTransaction.objects.all().delete()
        InventoryItem.objects.all().delete()
        StaffActivityLog.objects.all().delete()
        StaffInvite.objects.all().delete()
        StaffProfile.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()

    # -- users --------------------------------------------------------

    def seed_staff(self, n_staff, used_phones):
        self.log(f"Creating {n_staff} staff users...")
        roles = [StaffRole.OWNER] + [StaffRole.MANAGER] * max(1, n_staff // 5) + \
            [StaffRole.ATTENDANT] * (n_staff - 1 - max(1, n_staff // 5))
        while len(roles) < n_staff:
            roles.append(StaffRole.ATTENDANT)
        random.shuffle(roles)

        staff_users = []
        owner_ref = None
        for i, role in enumerate(roles[:n_staff]):
            first, last = rand_name()
            phone = rand_phone(used_phones)
            user = User.objects.create_user(
                phone_number=phone,
                password="Password123!",
                email=f"{first.lower()}.{last.lower()}{i}@wedemboyz.cm",
                first_name=first,
                last_name=last,
                is_staff=True,
                is_phone_verified=True,
            )
            staff_users.append(user)
            if role == StaffRole.OWNER:
                owner_ref = user

        # StaffProfile creation triggers StaffActivityLog via signal automatically.
        for user, role in zip(staff_users, roles[:n_staff]):
            StaffProfile.objects.create(
                user=user,
                role=role,
                is_active=True,
                invited_by=owner_ref if (owner_ref and user != owner_ref) else None,
            )

        # Give staff sensible profile info too (signal already made blank UserProfile/LoyaltyAccount).
        profiles = []
        for user in staff_users:
            profile = user.profile
            profile.city = random.choice(CITIES)
            profile.address_line = rand_address()
            profiles.append(profile)
        UserProfile.objects.bulk_update(profiles, ["city", "address_line"], batch_size=200)

        return staff_users

    def seed_customers(self, n_customers, used_phones, days_back):
        self.log(f"Creating {n_customers} customer users...")
        customers = []
        for i in range(n_customers):
            first, last = rand_name()
            phone = rand_phone(used_phones)
            has_email = random.random() < 0.55
            user = User.objects.create_user(
                phone_number=phone,
                password="Password123!",
                email=f"{first.lower()}.{last.lower()}{i}@gmail.com" if has_email else None,
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
            profiles, ["city", "address_line", "preferred_language", "date_of_birth"], batch_size=300
        )
        LoyaltyAccount.objects.bulk_update(
            loyalty_accounts, ["lifetime_points_earned", "points_balance", "tier"], batch_size=300
        )

        return customers

    def seed_notification_preferences(self, users):
        self.log(f"Creating notification preferences for {len(users)} users...")
        prefs = [
            NotificationPreference(
                user=u,
                sms_enabled=random.random() < 0.9,
                email_enabled=random.random() < 0.6,
                push_enabled=random.random() < 0.75,
                promo_opt_in=random.random() < 0.65,
            )
            for u in users
        ]
        NotificationPreference.objects.bulk_create(prefs, batch_size=300)

    # -- discounts / loyalty program setup --------------------------------

    def seed_promo_codes(self, days_back):
        self.log("Creating promo codes...")
        now = timezone.now()
        codes = []
        seeds = [
            ("WELCOME10", DiscountType.PERCENTAGE, Decimal("10")),
            ("WELCOME15", DiscountType.PERCENTAGE, Decimal("15")),
            ("SAVE500", DiscountType.FIXED, Decimal("500")),
            ("SAVE1000", DiscountType.FIXED, Decimal("1000")),
            ("WEEKEND20", DiscountType.PERCENTAGE, Decimal("20")),
            ("FIRSTWASH", DiscountType.PERCENTAGE, Decimal("25")),
            ("LOYALTY5", DiscountType.PERCENTAGE, Decimal("5")),
            ("BULK2000", DiscountType.FIXED, Decimal("2000")),
        ]
        for code, dtype, value in seeds:
            codes.append(PromoCode(
                code=code,
                description=f"{value}{'%' if dtype == DiscountType.PERCENTAGE else ' XAF'} off",
                discount_type=dtype,
                value=value,
                min_order_amount=Decimal(random.choice([0, 1000, 2000, 5000])),
                max_uses=random.choice([None, 50, 100, 200]),
                max_uses_per_user=random.choice([1, 1, 2, 3]),
                valid_from=now - timedelta(days=random.randint(30, days_back)),
                valid_until=now + timedelta(days=random.randint(10, 120)),
                is_active=random.random() < 0.85,
            ))
        # A batch of expired/random extra codes for volume.
        for i in range(12):
            dtype = random.choice(list(DiscountType))
            value = Decimal(random.choice([5, 10, 12, 15, 300, 500, 750])) if dtype == DiscountType.PERCENTAGE \
                else Decimal(random.choice([300, 500, 750, 1000, 1500]))
            codes.append(PromoCode(
                code=f"PROMO{100 + i}",
                description="Auto-generated promotional code",
                discount_type=dtype,
                value=value,
                min_order_amount=Decimal(random.choice([0, 500, 1000])),
                max_uses=random.choice([None, 20, 50]),
                max_uses_per_user=1,
                valid_from=now - timedelta(days=random.randint(60, days_back)),
                valid_until=now - timedelta(days=random.randint(1, 30)) if i % 3 == 0 else now + timedelta(days=60),
                is_active=i % 3 != 0,
            ))
        PromoCode.objects.bulk_create(codes, batch_size=100)
        return list(PromoCode.objects.all())

    def seed_loyalty_rules(self):
        self.log("Creating loyalty rules...")
        LoyaltyRule.objects.bulk_create([
            LoyaltyRule(name="Standard earning rate", points_per_currency_unit=Decimal("0.0100"),
                        min_spend=Decimal("0"), is_active=True),
            LoyaltyRule(name="Gold tier bonus rate", points_per_currency_unit=Decimal("0.0150"),
                        min_spend=Decimal("5000"), is_active=True),
            LoyaltyRule(name="Weekend double points", points_per_currency_unit=Decimal("0.0200"),
                        min_spend=Decimal("2000"), is_active=False),
        ])

    def seed_discount_campaigns(self, days_back):
        self.log("Creating discount campaigns...")
        now = timezone.now()
        campaigns = []
        names = [
            "New Year Fresh Start", "Back to School Special", "Rainy Season Wash & Fold",
            "Gold Member Appreciation", "Lapsed Customer Win-Back", "Independence Day Promo",
            "Ramadan Special", "Christmas Cleaning Rush", "End of Month Payday Deal",
            "Referral Bonus Week", "Dry Clean Weekend", "First Order Welcome Campaign",
        ]
        segments = list(DiscountCampaign.Segment)
        for name in names:
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
                end_date=start + timedelta(days=random.randint(7, 45)),
                is_active=random.random() < 0.5,
            ))
        DiscountCampaign.objects.bulk_create(campaigns, batch_size=50)

    # -- inventory ----------------------------------------------------

    def seed_inventory(self, staff_users, days_back):
        self.log("Creating inventory items and transactions...")
        items = []
        for name, category, unit in INVENTORY_ITEMS:
            qty = Decimal(random.randint(5, 500))
            items.append(InventoryItem(
                name=name, category=category, unit=unit, quantity=qty,
                low_stock_threshold=Decimal(random.randint(5, 50)),
                notes=rand_inventory_note(),
            ))
        InventoryItem.objects.bulk_create(items)
        items = list(InventoryItem.objects.all())

        transactions = []
        for item in items:
            for _ in range(random.randint(6, 20)):
                change_type = weighted_choice([
                    (InventoryTransaction.ChangeType.RESTOCK, 3),
                    (InventoryTransaction.ChangeType.USAGE, 6),
                    (InventoryTransaction.ChangeType.ADJUSTMENT, 1),
                ])
                if change_type == InventoryTransaction.ChangeType.RESTOCK:
                    qty_change = Decimal(random.randint(10, 200))
                    reason = "Delivery received from supplier"
                elif change_type == InventoryTransaction.ChangeType.USAGE:
                    qty_change = -Decimal(random.randint(1, 30))
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
        return items

    # -- payment methods ------------------------------------------------

    def seed_payment_methods(self, customers):
        self.log("Creating payment methods...")
        methods = []
        by_user = {}
        for user in customers:
            n = random.choice([0, 1, 1, 2])
            user_methods = []
            for i in range(n):
                gateway = random.choice(list(PaymentGateway))
                if gateway == PaymentGateway.MTN_MOMO:
                    label = f"MTN MoMo •••• {random.randint(1000, 9999)}"
                elif gateway == PaymentGateway.ORANGE_MONEY:
                    label = f"Orange Money •••• {random.randint(1000, 9999)}"
                elif gateway == PaymentGateway.STRIPE:
                    label = f"Visa •••• {random.randint(1000, 9999)}"
                elif gateway == PaymentGateway.CASH:
                    label = "Cash on delivery"
                else:
                    label = "Store credit"
                pm = PaymentMethod(
                    user=user, gateway=gateway, display_label=label,
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
        all_invoices = []
        all_refunds = []
        all_loyalty_txns = []
        all_promo_usages = []
        invoice_counter = 1

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

            # Build 1-5 line items for this order.
            n_items = random.randint(1, 5)
            order_items = []
            subtotal = Decimal(0)
            for _ in range(n_items):
                label, service_type = random.choice(ITEM_LABELS)
                weight = Decimal(str(round(random.uniform(0.3, 6.0), 2)))
                quantity = random.randint(1, 4)
                unit_price = Decimal(random.choice([500, 750, 1000, 1250, 1500, 2000, 2500, 3500]))
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
            if payment.status in (PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED) and random.random() < 0.85:
                invoice_counter += 1
                all_invoices.append(Invoice(
                    order=order,
                    invoice_number=f"INV-{order_dt.year}-{invoice_counter:06d}",
                    amount_due=order.total_amount,
                    amount_paid=order.total_amount if payment.status == PaymentStatus.SUCCEEDED
                    else (order.total_amount * Decimal("0.5")).quantize(Decimal("1")),
                ))
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
        Invoice.objects.bulk_create(all_invoices, batch_size=500)
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
        self.backdate(Invoice, all_invoices, days_back, touch_updated=False)
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
        for order in (random.sample(orders, k=min(len(orders), max(1, len(orders) // 8))) if orders else []):
            rooms.append(ChatRoom(
                customer=order.user, agent=random.choice(staff_users), order=order,
                status=random.choice(list(ChatRoom.Status)),
            ))
        # Standalone general-support chats.
        for _ in range(max(20, len(customers) // 5)):
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
            n_messages = random.randint(2, 10)
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
        all_txns = list(CreditTransaction.objects.filter(credit_account__in=accounts.values()))
        self.backdate(CreditTransaction, all_txns, days_back, touch_updated=False)

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

            def add(category, lo, hi):
                expenses.append(Expense(
                    category=category, amount=Decimal(random.randint(lo, hi)), currency=Currency.XAF,
                    date=rand_date_in_month(month_end), notes=random.choice(EXPENSE_NOTES[category]),
                    created_by=random.choice(staff_users),
                ))

            # Rent: one charge a month.
            add(ExpenseCategory.RENT, 150000, 350000)

            # Salaries: one charge per staff member a month.
            for _ in staff_users:
                add(ExpenseCategory.SALARIES, 40000, 150000)

            # Utilities: a couple of bills a month.
            for _ in range(random.randint(1, 3)):
                add(ExpenseCategory.UTILITIES, 15000, 60000)

            # Supplies: restocking happens fairly often.
            for _ in range(random.randint(2, 6)):
                add(ExpenseCategory.SUPPLIES, 8000, 60000)

            # Maintenance: occasional repairs.
            for _ in range(random.randint(0, 2)):
                add(ExpenseCategory.MAINTENANCE, 5000, 80000)

            # Other: small odds and ends.
            for _ in range(random.randint(1, 4)):
                add(ExpenseCategory.OTHER, 2000, 25000)

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

    def seed_staff_invites(self, staff_users, used_phones, days_back):
        self.log("Creating staff invites...")
        invites = []
        owner = staff_users[0]
        for _ in range(20):
            first, last = rand_name()
            phone = rand_phone(used_phones)
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
        for _ in range(1500):
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
            ("Expenses", Expense.objects.count()),
        ]
        width = max(len(label) for label, _ in rows)
        total = 0
        for label, count in rows:
            total += count
            self.stdout.write(f"  {label.ljust(width)} : {count:,}")
        self.stdout.write(self.style.SUCCESS(f"\nTotal rows across seeded tables: {total:,}"))