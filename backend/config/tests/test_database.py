import pytest
from django.core.exceptions import ImproperlyConfigured

from config.database import database_from_url


def test_local_database_url_decodes_credentials_and_database_name():
    db = database_from_url("postgresql://local%40user:p%23ss%2Fword@localhost:5433/laundry%20dev")
    assert db["ENGINE"] == "django.db.backends.postgresql"
    assert db["NAME"] == "laundry dev"
    assert db["USER"] == "local@user"
    assert db["PASSWORD"] == "p#ss/word"
    assert db["HOST"] == "localhost"
    assert db["PORT"] == 5433
    assert db["OPTIONS"] == {"connect_timeout": 10}
    assert not db["DISABLE_SERVER_SIDE_CURSORS"]


def test_neon_url_keeps_tls_and_connection_options():
    db = database_from_url(
        "postgres://user:password@ep-test-pooler.eu-west-1.aws.neon.tech/db"
        "?sslmode=verify-full&channel_binding=require&connect_timeout=20",
        conn_max_age=0,
    )
    assert db["OPTIONS"]["sslmode"] == "verify-full"
    assert db["OPTIONS"]["channel_binding"] == "require"
    assert int(db["OPTIONS"]["connect_timeout"]) == 20
    assert db["CONN_MAX_AGE"] == 0
    assert db["DISABLE_SERVER_SIDE_CURSORS"]


def test_ssl_defaults_are_appropriate_to_the_selected_database():
    assert (
        database_from_url("postgres://u:p@ep-direct.neon.tech/db")["OPTIONS"]["sslmode"]
        == "require"
    )
    assert "sslmode" not in database_from_url("postgres://u:p@127.0.0.1/db")["OPTIONS"]
    assert (
        database_from_url("postgres://u:p@remote.example/db", require_ssl=True)["OPTIONS"][
            "sslmode"
        ]
        == "require"
    )
    db = database_from_url("postgres://u:p@remote.example/db?sslmode=verify-full", require_ssl=True)
    assert db["OPTIONS"]["sslmode"] == "verify-full"


@pytest.mark.parametrize(
    "url",
    [
        "",
        "sqlite:///db.sqlite3",
        "postgres://host",
        "postgres:///db",
        "postgres://u:private#password@host/db",
        "postgres://u:p@host:invalid/db",
    ],
)
def test_invalid_urls_fail_without_exposing_credentials(url):
    with pytest.raises(ImproperlyConfigured) as exc:
        database_from_url(url)
    assert "DB_URL" in str(exc.value)
    assert "private" not in str(exc.value)
