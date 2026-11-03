"""Django email backend for Resend HTTP delivery (no extra SDK dependency)."""

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend


class EmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        if not email_messages:
            return 0
        if not settings.RESEND_API_KEY:
            raise ImproperlyConfigured("RESEND_API_KEY is required for email delivery")
        sent = 0
        for message in email_messages:
            if not message.recipients():
                continue
            try:
                payload = {
                    "from": message.from_email,
                    "to": message.to,
                    "subject": message.subject,
                    "text": message.body,
                }
                for content, mimetype in getattr(message, "alternatives", []):
                    if mimetype == "text/html":
                        payload["html"] = content
                if message.reply_to:
                    payload["reply_to"] = message.reply_to
                if message.cc:
                    payload["cc"] = message.cc
                if message.bcc:
                    payload["bcc"] = message.bcc
                headers = {"Authorization": f"Bearer {settings.RESEND_API_KEY}"}
                key = message.extra_headers.get("X-Entity-Ref-ID")
                if key:
                    headers["Idempotency-Key"] = key
                response = requests.post(
                    "https://api.resend.com/emails", headers=headers, json=payload, timeout=15
                )
                response.raise_for_status()
                sent += 1
            except Exception:
                if not self.fail_silently:
                    raise
        return sent
