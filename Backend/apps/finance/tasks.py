from config.celery import app


def _management_recipients():
    """Owners/managers, plus any superuser without a StaffProfile at all
    (covers the initial admin account before any invites are sent)."""
    from django.contrib.auth import get_user_model
    from django.db.models import Q

    User = get_user_model()
    return User.objects.filter(
        Q(is_superuser=True) | Q(staff_profile__role__in=["OWNER", "MANAGER"]),
        is_staff=True,
        is_active=True,
    ).distinct()


@app.task
def send_daily_revenue_recap():
    """'Today's revenue is X' — one SYSTEM notification per owner/manager,
    summarizing today's revenue, expenses, and profit. Scheduled to run
    once daily near closing time (see setup_alert_schedules command)."""
    from datetime import date

    from django.db.models import Sum

    from apps.finance.models import Expense
    from apps.notifications.models import Notification
    from apps.payments.models import Payment
    from core.constants import PaymentStatus

    today = date.today()

    revenue = (
        Payment.objects.filter(status=PaymentStatus.SUCCEEDED, paid_at__date=today).aggregate(
            total=Sum("amount")
        )["total"]
        or 0
    )
    expenses = Expense.objects.filter(date=today).aggregate(total=Sum("amount"))["total"] or 0
    profit = revenue - expenses

    recipients = list(_management_recipients())
    if not recipients:
        return

    for user in recipients:
        Notification.objects.create(
            user=user,
            notification_type=Notification.NotificationType.SYSTEM,
            title=f"Daily recap — {today.isoformat()}",
            body=f"Revenue: {revenue} XAF · Expenses: {expenses} XAF · Profit: {profit} XAF",
        )


@app.task
def send_credit_aging_reminders(min_days_overdue: int = 7):
    """'Client owes X since Y days' — flags credit accounts whose most
    recent charge is older than `min_days_overdue` and still unpaid down to
    zero. Dedupes against an already-unread alert for the same account so
    a daily run doesn't spam the same debt every day."""
    from django.utils import timezone

    from apps.finance.models import CreditAccount, CreditTransaction
    from apps.notifications.models import Notification

    recipients = list(_management_recipients())
    if not recipients:
        return

    cutoff = timezone.now() - timezone.timedelta(days=min_days_overdue)
    accounts = CreditAccount.objects.filter(balance__gt=0).select_related("user")

    for account in accounts:
        last_charge = (
            account.transactions.filter(transaction_type=CreditTransaction.TransactionType.CHARGE)
            .order_by("-created_at")
            .first()
        )
        if not last_charge or last_charge.created_at > cutoff:
            continue

        days_owed = (timezone.now() - last_charge.created_at).days
        customer_label = account.user.get_full_name() or account.user.phone_number
        title = f"Overdue credit: {customer_label}"

        for staff_user in recipients:
            already_alerted = Notification.objects.filter(
                user=staff_user,
                notification_type=Notification.NotificationType.SYSTEM,
                title=title,
                is_read=False,
            ).exists()
            if already_alerted:
                continue

            Notification.objects.create(
                user=staff_user,
                notification_type=Notification.NotificationType.SYSTEM,
                title=title,
                body=f"Owes {account.balance} XAF, unpaid for {days_owed} days since the last charge.",
            )
