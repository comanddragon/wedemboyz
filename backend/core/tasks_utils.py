"""Transaction-safe dispatch into the Postgres jobs outbox."""

import logging

from django.db import transaction

logger = logging.getLogger("apps")


def safe_delay(task, *args, **kwargs):
    """Persist a job after the surrounding transaction commits successfully."""

    def dispatch():
        try:
            task.delay(*args, **kwargs)
        except Exception:
            logger.exception("Failed to persist background job %s", task.name)

    transaction.on_commit(dispatch)
