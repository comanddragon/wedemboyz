import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from django.utils.module_loading import import_string

from core.jobs import retry_at

from .models import Job

logger = logging.getLogger("apps")


PERIODIC_JOBS = (
    # task name, local hour, local minute, kwargs
    ("apps.payments.tasks.expire_subscriptions", 2, 0, {}),
    ("apps.discounts.tasks.expire_promos", 2, 10, {}),
    ("apps.inventory.tasks.check_low_stock_daily", 8, 0, {}),
    ("apps.finance.tasks.send_credit_aging_reminders", 9, 0, {"min_days_overdue": 7}),
    ("apps.finance.tasks.send_daily_revenue_recap", 21, 0, {}),
)


def enqueue_periodic_jobs(now=None):
    """Materialize today's periodic work without creating duplicates."""
    now = now or timezone.now()
    local_now = timezone.localtime(now)
    for task_name, hour, minute, kwargs in PERIODIC_JOBS:
        if (local_now.hour, local_now.minute) < (hour, minute):
            continue
        key = f"periodic:{task_name}:daily:{local_now.date().isoformat()}"
        Job.objects.get_or_create(
            idempotency_key=key,
            defaults={
                "task_name": task_name,
                "args": [],
                "kwargs": kwargs,
                "run_at": now,
                "max_attempts": 3,
            },
        )


def _claim_due_job(now):
    with transaction.atomic():
        job = (
            Job.objects.select_for_update(skip_locked=True)
            .filter(status__in=(Job.Status.PENDING, Job.Status.RETRY), run_at__lte=now)
            .order_by("run_at", "id")
            .first()
        )
        if job is None:
            return None
        job.status = Job.Status.RUNNING
        job.locked_at = now
        job.attempts += 1
        job.save(update_fields=("status", "locked_at", "attempts", "updated_at"))
        return job


def _finish(job, *, error=None):
    if error is None:
        Job.objects.filter(pk=job.pk, status=Job.Status.RUNNING).update(
            status=Job.Status.SUCCEEDED,
            locked_at=None,
            last_error="",
            updated_at=timezone.now(),
        )
        return "succeeded"

    terminal = job.attempts >= job.max_attempts
    values = {
        "status": Job.Status.FAILED if terminal else Job.Status.RETRY,
        "locked_at": None,
        "last_error": str(error)[:4000],
        "updated_at": timezone.now(),
    }
    if not terminal:
        values["run_at"] = retry_at(job.attempts)
    Job.objects.filter(pk=job.pk, status=Job.Status.RUNNING).update(**values)
    logger.exception("Background job %s failed", job.task_name, exc_info=error)
    return "failed" if terminal else "retried"


def recover_stale_jobs(now=None, stale_after=timedelta(minutes=15)):
    now = now or timezone.now()
    return Job.objects.filter(
        status=Job.Status.RUNNING,
        locked_at__lt=now - stale_after,
    ).update(
        status=Job.Status.RETRY,
        locked_at=None,
        run_at=now,
        last_error="Recovered after a stale worker lock.",
    )


def run_due_jobs(*, batch_size=25, time_budget_seconds=20):
    """Claim and execute a bounded batch; safe for concurrent cron calls."""
    started = timezone.now()
    result = {"claimed": 0, "succeeded": 0, "retried": 0, "failed": 0}

    recover_stale_jobs(started)
    enqueue_periodic_jobs(started)

    while result["claimed"] < batch_size:
        if (timezone.now() - started).total_seconds() >= time_budget_seconds:
            break
        job = _claim_due_job(timezone.now())
        if job is None:
            break

        result["claimed"] += 1
        try:
            task = import_string(job.task_name)
            task(*job.args, **job.kwargs)
        except Exception as exc:
            outcome = _finish(job, error=exc)
        else:
            outcome = _finish(job)
        result[outcome] += 1

    return result
