from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # API v1
    path("api/v1/auth/", include("apps.users.api.urls.auth")),
    path("api/v1/users/", include("apps.users.api.urls.profile")),
    path("api/v1/users/", include("apps.users.api.urls.admin")),
    path("api/v1/orders/", include("apps.orders.api.urls.order")),
    path("api/v1/schedule/", include("apps.orders.api.urls.schedule")),
    path("api/v1/payments/", include("apps.payments.api.urls.payment")),
    path("api/v1/invoices/", include("apps.payments.api.urls.invoice")),
    path("api/v1/refunds/", include("apps.payments.api.urls.refund")),
    path("api/v1/subscriptions/", include("apps.payments.api.urls.subscription")),
    path("api/v1/webhooks/", include("apps.payments.api.urls.webhooks")),
    path("api/v1/discounts/", include("apps.discounts.api.urls.promo")),
    path("api/v1/loyalty/", include("apps.discounts.api.urls.loyalty")),
    path("api/v1/chat/", include("apps.chat.api.urls.room")),
    path("api/v1/notifications/", include("apps.notifications.api.urls.notification")),
    path("api/v1/staff/", include("apps.staff.api.urls.staff")),
    path("api/v1/finance/", include("apps.finance.api.urls.finance")),
    path("api/v1/inventory/", include("apps.inventory.api.urls.inventory")),
]

# API schema / docs (drf-spectacular)
urlpatterns += [
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/v1/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

    # debug_toolbar's middleware is active whenever DEBUG=True (see
    # settings/development.py) and needs its urls registered under the
    # 'djdt' namespace, or it 500s on every single response.
    import debug_toolbar

    urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]
