"""Repair referral awards from recorded promo usages, without resetting balances."""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.discounts.models import AmbassadorCredit, PromoUsage
from services.loyalty import award_ambassador_credit


class Command(BaseCommand):
    help = "Preview missing/under-awarded ambassador credits. Use --apply to persist."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--order-id", type=int, action="append", help="Limit to reviewed order IDs; repeatable.")

    def handle(self, *args, **options):
        usages = PromoUsage.objects.filter(
            promo_code__ambassador_profile__isnull=False,
            order__deleted_at__isnull=True,
            user__is_staff=False,
            user__is_superuser=False,
        ).exclude(order__status="CANCELLED").exclude(
            user__email__iendswith="@seed.wedemboyz.invalid"
        ).select_related("order", "user", "promo_code").order_by("order_id", "pk")
        if options["order_id"]:
            usages = usages.filter(order_id__in=options["order_id"])
        count = 0
        total = Decimal("0")
        # Dry-run uses the exact award path, rolling back ALL database changes.
        with transaction.atomic():
            for usage in usages.iterator():
                if usage.user_id != usage.order.user_id:
                    continue
                if "seed-data" in (getattr(getattr(usage.user, "profile", None), "tags", None) or []):
                    continue
                before = AmbassadorCredit.objects.filter(order_id=usage.order_id).values_list(
                    "credit_amount", flat=True
                ).first() or Decimal("0")
                entry = award_ambassador_credit(usage, include_inactive=True)
                delta = (entry.credit_amount if entry else before) - before
                if delta > 0:
                    count += 1
                    total += delta
                    self.stdout.write(
                        f"order={usage.order_id} ambassador={entry.ambassador_id} "
                        f"previous={before} credit={entry.credit_amount} added={delta}"
                    )
            if not options["apply"]:
                transaction.set_rollback(True)
        mode = "APPLIED" if options["apply"] else "DRY RUN (nothing saved)"
        self.stdout.write(f"{mode}: {count} orders; {total} credits added.")
