import json

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Registers the proactive-alert periodic tasks (daily revenue recap, "
        "credit-aging reminders, low-stock sweep) with django-celery-beat. "
        "Safe to re-run — schedules and tasks are get_or_create'd, not duplicated. "
        "Run this once per environment (e.g. as part of deploy/release), after "
        "migrations, with a Celery worker + beat process running to pick them up."
    )

    # (name, task, hour, minute, kwargs)
    SCHEDULE = [
        (
            "Daily revenue recap",
            "apps.finance.tasks.send_daily_revenue_recap",
            21,
            0,
            {},
        ),
        (
            "Credit aging reminders",
            "apps.finance.tasks.send_credit_aging_reminders",
            9,
            0,
            {"min_days_overdue": 7},
        ),
        (
            "Low-stock daily sweep",
            "apps.inventory.tasks.check_low_stock_daily",
            8,
            0,
            {},
        ),
    ]

    def handle(self, *args, **options):
        from django_celery_beat.models import CrontabSchedule, PeriodicTask

        for name, task, hour, minute, kwargs in self.SCHEDULE:
            schedule, _ = CrontabSchedule.objects.get_or_create(
                minute=str(minute),
                hour=str(hour),
                day_of_week="*",
                day_of_month="*",
                month_of_year="*",
                timezone="Africa/Douala",
            )

            periodic_task, created = PeriodicTask.objects.update_or_create(
                name=name,
                defaults={
                    "task": task,
                    "crontab": schedule,
                    "interval": None,
                    "enabled": True,
                    "kwargs": json.dumps(kwargs),
                },
            )

            verb = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{verb}: {name} → {task} at {hour:02d}:{minute:02d}"))
