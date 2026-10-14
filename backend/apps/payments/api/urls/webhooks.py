from django.urls import path

from apps.payments.api.views import (
    CamPayWebhookView,
    MoMoWebhookView,
    OrangeMoneyWebhookView,
    PayPalWebhookView,
    StripeWebhookView,
)

urlpatterns = [
    path("stripe/", StripeWebhookView.as_view(), name="webhook-stripe"),
    path("paypal/", PayPalWebhookView.as_view(), name="webhook-paypal"),
    # Point CamPay's dashboard "Webhook URL" at this one for both MTN and Orange.
    path("campay/", CamPayWebhookView.as_view(), name="webhook-campay"),
    # Deprecated aliases — kept in case either is already configured as a
    # notification URL somewhere; both just delegate to CamPayWebhookView.
    path("mtn-momo/", MoMoWebhookView.as_view(), name="webhook-mtn-momo"),
    path("orange-money/", OrangeMoneyWebhookView.as_view(), name="webhook-orange-money"),
]
