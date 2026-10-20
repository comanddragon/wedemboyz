from django.urls import path

from apps.staff.api.views import (
    BusinessSettingsView,
    GlobalAuditLogView,
    PriceItemDetailView,
    PriceItemListCreateView,
    SubscriptionPlanSettingDetailView,
    SubscriptionPlanSettingListCreateView,
    ChatAssignableStaffListView,
    OperationalStaffListView,
    StaffActivityLogListView,
    StaffDetailUpdateView,
    StaffInviteAcceptView,
    StaffInviteListCreateView,
    StaffInviteResendView,
    StaffInviteRevokeView,
    StaffListView,
)

urlpatterns = [
    path("settings/", BusinessSettingsView.as_view(), name="business-settings"),
    path("settings/prices/", PriceItemListCreateView.as_view(), name="price-list"),
    path("settings/prices/<int:pk>/", PriceItemDetailView.as_view(), name="price-detail"),
    path("settings/plans/", SubscriptionPlanSettingListCreateView.as_view(), name="plan-setting-list"),
    path("settings/plans/<int:pk>/", SubscriptionPlanSettingDetailView.as_view(), name="plan-setting-detail"),
    path("audit/", GlobalAuditLogView.as_view(), name="global-audit"),
    path("", StaffListView.as_view(), name="staff-list"),
    path("chat-agents/", ChatAssignableStaffListView.as_view(), name="staff-chat-agents"),
    path("operations/", OperationalStaffListView.as_view(), name="staff-operations"),
    path("<int:pk>/", StaffDetailUpdateView.as_view(), name="staff-detail"),
    path("<int:pk>/activity/", StaffActivityLogListView.as_view(), name="staff-activity"),
    path("invites/", StaffInviteListCreateView.as_view(), name="staff-invite-list"),
    path("invites/accept/", StaffInviteAcceptView.as_view(), name="staff-invite-accept"),
    path("invites/<int:pk>/revoke/", StaffInviteRevokeView.as_view(), name="staff-invite-revoke"),
    path("invites/<int:pk>/resend/", StaffInviteResendView.as_view(), name="staff-invite-resend"),
]
