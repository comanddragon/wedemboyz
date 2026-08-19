import json

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Registers the daily subscription-expiration sweep with django-celery-beat. "
        "Safe to re-run — schedule and task are get_or_create'd, not duplicated. "
        "Run this once per environment (e.g. as part of deploy/release), after "
        "migrations, with a Celery worker + beat process running to pick it up."
    )

    # (name, task, hour, minute, kwargs)
    SCHEDULE = [
        (
            "Expire lapsed subscriptions",
            "apps.payments.tasks.expire_subscriptions",
            2,
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
