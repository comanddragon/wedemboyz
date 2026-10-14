from django.urls import path

from apps.staff.api.views import (
    StaffActivityLogListView,
    StaffDetailUpdateView,
    StaffInviteAcceptView,
    StaffInviteListCreateView,
    StaffInviteRevokeView,
    StaffListView,
)

urlpatterns = [
    path("", StaffListView.as_view(), name="staff-list"),
    path("<int:pk>/", StaffDetailUpdateView.as_view(), name="staff-detail"),
    path("<int:pk>/activity/", StaffActivityLogListView.as_view(), name="staff-activity"),
    path("invites/", StaffInviteListCreateView.as_view(), name="staff-invite-list"),
    path("invites/accept/", StaffInviteAcceptView.as_view(), name="staff-invite-accept"),
    path("invites/<int:pk>/revoke/", StaffInviteRevokeView.as_view(), name="staff-invite-revoke"),
]
