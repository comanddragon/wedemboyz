from config.celery import app


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_sms(self, user_id: int):
    from apps.users.models import CustomUser
    from services import sms

    try:
        user = CustomUser.objects.get(pk=user_id)
        sms.send_sms(
            user.phone_number,
            "Welcome to WEDEMBOYZ Lavomatique! Book your first pickup in the app.",
        )
    except Exception as exc:
        raise self.retry(exc=exc)
