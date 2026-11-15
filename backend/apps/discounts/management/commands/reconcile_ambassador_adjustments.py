"""Record manual balance edits that were made before adjustments were tracked.

Before AmbassadorCreditAdjustment existed, an admin edit changed only
``credit_balance``, so the leaderboard never saw it. For every ambassador:

    untracked = credit_balance - (referral credits + recorded adjustments - cashouts)

A non-zero result is saved as one adjustment dated in ``--period`` (default: the
current month). The balance itself is NOT changed. Dry-run unless --apply.
Running it twice is safe: the second run finds nothing left to record.
"""
from datetime import date, datetime
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from apps.discounts.models import AmbassadorCreditAdjustment, AmbassadorProfile


def _sum(queryset, field):
    return queryset.aggregate(total=Sum(field))["total"] or Decimal("0")


class Command(BaseCommand):
    help = "Preview (default) or record untracked manual ambassador balance edits."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")
        parser.add_argument(
            "--period", help="Month the credits count towards, YYYY-MM (default: current month)."
        )

    def handle(self, *args, **options):
        now = timezone.localtime()
        created_at = now
        if options["period"]:
            try:
                year, month = (int(part) for part in options["period"].split("-"))
                target = date(year, month, 1)
            except ValueError as exc:
                raise CommandError("Use --period YYYY-MM.") from exc
            if target > date(now.year, now.month, 1):
                raise CommandError("Choose the current or a past month.")
            if (year, month) != (now.year, now.month):
                created_at = timezone.make_aware(datetime(year, month, 15, 12, 0))

        total = Decimal("0")
        with transaction.atomic():
            for profile in AmbassadorProfile.objects.select_for_update().select_related("user"):
                tracked = (
                    _sum(profile.credits, "credit_amount")
                    + _sum(profile.credit_adjustments, "amount")
                    - _sum(profile.cashouts, "amount")
                )
                gap = profile.credit_balance - tracked
                if gap == 0:
                    continue
                total += gap
                self.stdout.write(
                    f"{profile.user.get_full_name() or profile.pk}: balance={profile.credit_balance} "
                    f"tracked={tracked} untracked={gap}"
                )
                row = AmbassadorCreditAdjustment.objects.create(
                    ambassador=profile,
                    amount=gap,
                    previous_balance=profile.credit_balance,
                    new_balance=profile.credit_balance,
                )
                AmbassadorCreditAdjustment.objects.filter(pk=row.pk).update(created_at=created_at)
            if not options["apply"]:
                transaction.set_rollback(True)
        mode = "APPLIED" if options["apply"] else "DRY RUN (nothing saved)"
        self.stdout.write(f"{mode}: {total} credits recorded for the leaderboard.")
