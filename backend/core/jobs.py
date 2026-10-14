"""Task registration and dispatch backed by the Postgres jobs table."""

from dataclasses import dataclass
from datetime import timedelta
from functools import update_wrapper

from django.utils import timezone


class RetryJob(Exception):
    """Signal that the current job should be retried."""


@dataclass
class JobContext:
    def retry(self, exc=None, **_kwargs):
        raise RetryJob(str(exc) if exc else "Job requested a retry") from exc


class JobTask:
    def __init__(self, func, *, bind=False, max_retries=3, default_retry_delay=60):
        self.func = func
        self.bind = bind
        self.max_attempts = max_retries + 1
        self.default_retry_delay = default_retry_delay
        self.name = f"{func.__module__}.{func.__name__}"
        update_wrapper(self, func)

    def __call__(self, *args, **kwargs):
        if self.bind:
            return self.func(JobContext(), *args, **kwargs)
        return self.func(*args, **kwargs)

    def delay(self, *args, **kwargs):
        return enqueue(
            self.name,
            args=args,
            kwargs=kwargs,
            max_attempts=self.max_attempts,
        )


class JobApp:
    def task(self, func=None, **options):
        def decorate(target):
            return JobTask(target, **options)

        return decorate(func) if func is not None else decorate


app = JobApp()


def enqueue(
    task_name,
    *,
    args=(),
    kwargs=None,
    run_at=None,
    max_attempts=3,
    idempotency_key=None,
):
    from apps.jobs.models import Job

    values = {
        "task_name": task_name,
        "args": list(args),
        "kwargs": kwargs or {},
        "run_at": run_at or timezone.now(),
        "max_attempts": max_attempts,
    }
    if idempotency_key:
        job, _created = Job.objects.get_or_create(idempotency_key=idempotency_key, defaults=values)
        return job
    return Job.objects.create(**values)


def retry_at(attempts, base_delay=60):
    delay = min(base_delay * (2 ** max(attempts - 1, 0)), 3600)
    return timezone.now() + timedelta(seconds=delay)
