from django.urls import path

from apps.users.api.views import ChangePasswordView, PreferencesView, ProfileView

urlpatterns = [
    path("me/", ProfileView.as_view(), name="user-profile"),
    path("me/change-password/", ChangePasswordView.as_view(), name="user-change-password"),
    path("me/preferences/", PreferencesView.as_view(), name="user-preferences"),
]
