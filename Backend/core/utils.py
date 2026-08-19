"""Small shared helpers used across apps. Keep this dependency-light."""

import re
from decimal import ROUND_HALF_UP, Decimal


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
