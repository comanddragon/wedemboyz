from django.urls import path

from apps.users.api.views import (
    ClaimGuestAccountView,
    GuestSessionView,
    LoginView,
    LogoutView,
    RegisterView,
    TokenRefreshView,
)

from apps.users.api.views.password import PasswordResetConfirmView, PasswordResetRequestView

urlpatterns = [
    path("password/reset/", PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("guest/", GuestSessionView.as_view(), name="auth-guest"),
    path("guest/claim/", ClaimGuestAccountView.as_view(), name="auth-guest-claim"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
]
