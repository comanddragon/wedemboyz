from email.utils import parseaddr

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email


class Command(BaseCommand):
    help = "Check production email configuration without sending an email."

    def handle(self, *args, **options):
        problems = []
        key = settings.RESEND_API_KEY
        if not key or key.startswith("replace-"):
            problems.append("Configure RESEND_API_KEY with a real Resend API key.")
        sender = parseaddr(settings.RESEND_FROM)[1]
        try:
            validate_email(sender)
            if not settings.EMAIL_REPLY_TO or not settings.ORDER_NOTIFICATION_EMAILS:
                raise ValidationError("Email recipient lists must not be empty.")
            for address in [*settings.EMAIL_REPLY_TO, *settings.ORDER_NOTIFICATION_EMAILS]:
                validate_email(address)
        except ValidationError:
            problems.append(
                "RESEND_FROM, EMAIL_REPLY_TO and ORDER_NOTIFICATION_EMAILS "
                "must contain valid addresses."
            )
        if sender and sender.rsplit("@", 1)[-1].lower() not in {
            "wedemboyz-lavomatique.com",
            "updates.wedemboyz-lavomatique.com",
        }:
            problems.append(
                "RESEND_FROM must use a verified Wedemboyz root or updates sending domain."
            )
        if not settings.FRONTEND_URL.startswith("https://wedemboyz-lavomatique.com"):
            problems.append("FRONTEND_URL must point to the production HTTPS website.")
        if settings.EMAIL_BACKEND != "services.email_backend.EmailBackend":
            problems.append("Active email backend is not Resend (expected in local/test settings).")
        if problems:
            raise CommandError("\n".join(problems))
        self.stdout.write(
            self.style.SUCCESS(
                "Email configuration is ready. Verify the sending domain in "
                "Resend and keep the jobs runner active."
            )
        )
