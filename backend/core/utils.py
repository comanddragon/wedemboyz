"""Small shared helpers used across apps. Keep this dependency-light."""

import re
import secrets
from decimal import ROUND_HALF_UP, Decimal

# Guest accounts still need a unique phone_number (it's the USERNAME_FIELD).
# This prefix isn't a valid country code, so a placeholder can never collide
# with — or be dialled as — a real subscriber number.
GUEST_PHONE_PREFIX = "999000"


def make_guest_phone() -> str:
    """15-digit placeholder: GUEST_PHONE_PREFIX + 9 random digits."""
    return GUEST_PHONE_PREFIX + "".join(secrets.choice("0123456789") for _ in range(9))


def is_guest_placeholder_phone(phone_number: str) -> bool:
    return (phone_number or "").startswith(GUEST_PHONE_PREFIX)


def contact_phone(user) -> str:
    """The number to actually reach this user on. Guests have a placeholder
    account number, so they're reached on the contact number they gave when
    booking (stored on their profile), or not at all."""
    if not getattr(user, "is_guest", False):
        return user.phone_number
    profile = getattr(user, "profile", None)
    return (getattr(profile, "secondary_phone", "") or "") if profile else ""


def format_phone_number(raw: str, default_country_code: str = "237") -> str:
    """
    Normalize a phone number to E.164-ish digits-only form with a country code.
    E.g. '677 12 34 56' -> '237677123456'.
    """
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("00"):
        digits = digits[2:]
    if not digits.startswith(default_country_code) and len(digits) <= 9:
        digits = f"{default_country_code}{digits}"
    return digits


def round_money(amount: Decimal, cents: int = 0) -> Decimal:
    """
    Round a monetary amount. Defaults to whole units (0 decimal places),
    which fits XAF — a currency with no minor unit in everyday use.
    """
    quantum = Decimal("1") if cents == 0 else Decimal("1").scaleb(-cents)
    return Decimal(amount).quantize(quantum, rounding=ROUND_HALF_UP)
