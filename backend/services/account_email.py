"""Account security mail. Never include passwords or tokens in logs."""

import hashlib

from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from services.email import queue_email


def request_password_reset(user):
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    return queue_email(
        user,
        "password_reset",
        key=f"password-reset/{user.pk}/{token}",
        path=f"reset-password?uid={uid}&token={token}",
        essential=True,
    )


def password_changed(user):
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
    version = hashlib.sha256(user.password.encode()).hexdigest()[:24]
    return queue_email(
        user,
        "password_changed",
        key=f"password-changed/{user.pk}/{version}",
        path="login",
        essential=True,
    )
