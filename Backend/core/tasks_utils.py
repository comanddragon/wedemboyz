"""
Wrap Celery's .delay() so that a broker outage (Redis down, network blip)
degrades gracefully instead of taking down the request that triggered it.

Without this, every signal handler that fires a background task (welcome SMS,
status-update SMS, loyalty points, chat notifications, receipts) would raise
a raw kombu/redis ConnectionError straight through the view — meaning things
like user registration or placing an order fail outright any time the broker
is unreachable, even though those are core writes that already succeeded in
the database. A notification failing to send should never roll back or 500
a transaction that already committed.
"""

import logging

logger = logging.getLogger("apps")


def safe_delay(task, *args, **kwargs):
    """Call task.delay(*args, **kwargs); log and swallow broker errors instead
    of propagating them. Returns the AsyncResult, or None if dispatch failed."""
    try:
        return task.delay(*args, **kwargs)
    except Exception:
        logger.exception("Failed to enqueue task %s — broker may be unreachable", task.name)
        return None
