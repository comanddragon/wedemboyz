"""Shared PostgreSQL URL configuration for local and production settings."""

from urllib.parse import urlsplit

import dj_database_url
from django.core.exceptions import ImproperlyConfigured


def database_from_url(url, *, conn_max_age=60, require_ssl=False):
    try:
        parsed = urlsplit(url)
        if parsed.scheme not in {"postgres", "postgresql"} or not parsed.hostname:
            raise ValueError
        if not parsed.path.strip("/") or parsed.fragment:
            raise ValueError
        database = dj_database_url.parse(url, conn_max_age=conn_max_age)
    except (ValueError, TypeError):
        # URLs contain credentials: never include the supplied value in errors.
        raise ImproperlyConfigured(
            "DB_URL must be a valid postgres:// or postgresql:// connection URL "
            "with a hostname and database name. URL-encode special characters in credentials."
        ) from None

    options = database.setdefault("OPTIONS", {})
    options.setdefault("connect_timeout", 10)
    if require_ssl or parsed.hostname.endswith(".neon.tech"):
        options.setdefault("sslmode", "require")
    # PgBouncer transaction pooling cannot support Django's server-side cursors.
    database["DISABLE_SERVER_SIDE_CURSORS"] = parsed.hostname.split(".")[0].endswith("-pooler")
    return database
