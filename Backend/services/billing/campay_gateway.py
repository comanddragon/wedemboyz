"""
CamPay collects MTN Mobile Money and Orange Money payments through a single
API — it auto-detects the operator from the phone number's prefix, so the
same `initiate_collection()` call is used for both PaymentGateway.MTN_MOMO
and PaymentGateway.ORANGE_MONEY (see apps/payments/api/views/subscription.py
and apps/payments/api/views/payment.py).

Flow (matches the "call gateway first, write second" pattern used by
stripe_gateway/paypal_gateway):

1. initiate_collection() calls CamPay's non-blocking initCollect endpoint,
   which pushes a USSD/MoMo-PIN prompt to the customer's phone and
   immediately returns a `reference` — it does NOT wait for the customer to
   confirm (unlike the SDK's `collect()`, which blocks/polls for up to
   minutes; that's wrong for a Django request/response cycle).
2. The caller stores that `reference` as Payment.gateway_reference and
   leaves the Payment PENDING.
3. CamPay calls our webhook (CamPayWebhookView) once the customer confirms
   or the request times out/fails, flipping the Payment to
   SUCCEEDED/FAILED — see apps/payments/api/views/webhooks.py and
   apps/payments/tasks.py::process_webhook.

Env vars: CAMPAY_APP_USERNAME, CAMPAY_APP_PASSWORD, CAMPAY_ENVIRONMENT
("DEV" or "PROD"), CAMPAY_WEBHOOK_KEY (optional).

initiate_collection() calls CamPay's REST /api/collect/ endpoint directly
(rather than the bundled `campay` SDK's Client.initCollect(), which
hardcodes its request body to amount/currency/from/description/
external_reference and silently ignores anything else) so it can also pass
the paying user's identity through as optional CamPay metadata
(external_user/extra_email/extra_first_name/extra_last_name).
"""

from campay.sdk import Client as CamPayClient
from django.conf import settings

class CamPayConfigurationError(Exception):
    """Raised when CAMPAY_APP_USERNAME/CAMPAY_APP_PASSWORD aren't set — a
    deploy/config problem, not user error."""


class CamPayAPIError(Exception):
    """Raised when CamPay rejects the collection request (bad phone number,
    auth failure, etc)."""


def _client() -> CamPayClient:
    if not settings.CAMPAY_APP_USERNAME or not settings.CAMPAY_APP_PASSWORD:
        raise CamPayConfigurationError(
            "CAMPAY_APP_USERNAME / CAMPAY_APP_PASSWORD are not set. Register an "
            "application in your CamPay dashboard and put its credentials in .env."
        )
    return CamPayClient(
        {
            "app_username": settings.CAMPAY_APP_USERNAME,
            "app_password": settings.CAMPAY_APP_PASSWORD,
            "environment": settings.CAMPAY_ENVIRONMENT,
        }
    )


def normalize_phone_number(phone_number: str) -> str:
    """CamPay wants the phone number as digits only, with the 237 country
    code prefix (e.g. "237677300001"). Accepts numbers already in that
    format, with a leading '+', or in local 9-digit form."""
    digits = "".join(ch for ch in phone_number if ch.isdigit())
    if digits.startswith("237"):
        return digits
    if len(digits) == 9:
        return f"237{digits}"
    return digits


def initiate_collection(
    *, amount, phone_number: str, description: str, external_reference: str, user=None
) -> dict:
    """Pushes a MoMo/OM collection prompt to the customer's phone and
    returns immediately. Returns {"reference": ..., "ussd_code": ...,
    "operator": "mtn"|"orange"}. Raises CamPayAPIError on failure.

    If `user` is given, also forwards their identity to CamPay as optional
    metadata on the transaction (external_user/extra_email/
    extra_first_name/extra_last_name — visible on the CamPay dashboard
    transaction detail, doesn't affect the charge itself). The bundled
    `campay` SDK's Client.initCollect() hardcodes its request body to only
    amount/currency/from/description/external_reference and silently drops
    anything else, so this calls CamPay's REST /api/collect/ endpoint
    directly instead, reusing the SDK only for host resolution/config and
    Client.get_token()."""
    client = _client()
    token = client.get_token().get("token")
    if not token:
        raise CamPayAPIError(
            "Token error. Please check your App Username and App password. Also check your environment"
        )

    payload = {
        "amount": str(amount),
        "currency": "XAF",
        "from": normalize_phone_number(phone_number),
        "description": description,
        "external_reference": str(external_reference),
    }
    if user is not None:
        if getattr(user, "pk", None):
            payload["external_user"] = str(user.pk)
        if getattr(user, "email", None):
            payload["email"] = user.email
        if getattr(user, "first_name", None):
            payload["first_name"] = user.first_name
        if getattr(user, "last_name", None):
            payload["last_name"] = user.last_name

    import requests

    try:
        response = requests.post(
            f"{client.host}/api/collect/",
            json=payload,
            headers={"Authorization": f"Token {token}", "Content-Type": "application/json"},
            verify=False,
            timeout=15,
        )
        result = response.json()
    except (requests.RequestException, ValueError) as exc:
        raise CamPayAPIError(f"CamPay collection request failed: {exc}") from exc

    if response.status_code != 200 or not result or "reference" not in result:
        message = (result or {}).get("message", "CamPay collection request failed.")
        raise CamPayAPIError(message)

    return result


def get_transaction_status(reference: str) -> dict:
    """Polls CamPay for a transaction's current status — a fallback for
    reconciliation if a webhook delivery is ever missed. Returns a dict
    with at least {"reference", "status"} where status is one of
    PENDING/SUCCESSFUL/FAILED."""
    client = _client()
    return client.get_transaction_status({"reference": reference})


def verify_webhook_signature(payload: dict, signature: str) -> bool:
    """CamPay's dashboard lets you set a Webhook key used to sign callback
    payloads — observed in practice as an HS256 JWT (not a raw HMAC-SHA256
    hex digest as previously assumed here). The JWT's claims don't bind to
    the specific reference/amount (just {iat, nbf, exp, source: "CamPay"}),
    so this only proves the callback was signed with your CAMPAY_WEBHOOK_KEY
    within a valid time window — it does not vouch for the payload contents.
    If no CAMPAY_WEBHOOK_KEY is configured, verification is skipped (fine
    for DEV testing, not recommended once you go live)."""
    webhook_key = settings.CAMPAY_WEBHOOK_KEY
    if not webhook_key:
        return True
    if not signature:
        return False

    import jwt as pyjwt

    try:
        claims = pyjwt.decode(signature, webhook_key, algorithms=["HS256"])
    except pyjwt.InvalidTokenError:
        return False

    return claims.get("source") == "CamPay"


def parse_webhook_status(payload: dict) -> str:
    """Maps CamPay's status string to our PaymentStatus."""
    from core.constants import PaymentStatus

    return {
        "SUCCESSFUL": PaymentStatus.SUCCEEDED,
        "FAILED": PaymentStatus.FAILED,
        "PENDING": PaymentStatus.PENDING,
    }.get(payload.get("status", ""), "")


def gateway_for_operator(operator: str) -> str:
    """CamPay's payload includes which network handled the transaction
    ("MTN" or "ORANGE") — used by the webhook to disambiguate which of our
    two gateway choices a given reference belongs to."""
    from core.constants import PaymentGateway

    return {
        "MTN": PaymentGateway.MTN_MOMO,
        "ORANGE": PaymentGateway.ORANGE_MONEY,
    }.get((operator or "").upper(), "")
