from django.db import transaction
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.payments.api.serializers import (
    AdminSubscriptionSerializer,
    SubscriptionAdminActionSerializer,
    SubscriptionCheckoutSerializer,
    SubscriptionCreateSerializer,
    SubscriptionSerializer,
)
from apps.payments.models import Subscription
from apps.staff.permissions import HasStaffPermission, StaffPermission
from core.constants import PaymentGateway
from core.permissions import IsRegisteredUser


class SubscriptionListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/subscriptions/

    Unpaginated by design: a customer realistically has a handful of
    subscriptions ever, and the frontend (types/payment.ts, MembershipCard/
    dashboard/subscription page) expects a bare Subscription[] here, not
    the project's standard {count, results, ...} envelope.
    """

    permission_classes = [IsRegisteredUser]
    pagination_class = None

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        return (
            SubscriptionCreateSerializer
            if self.request.method == "POST"
            else SubscriptionSerializer
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        subscription = serializer.save()
        return Response(SubscriptionSerializer(subscription).data, status=status.HTTP_201_CREATED)


class SubscriptionDetailView(generics.RetrieveAPIView):
    """GET /api/v1/subscriptions/{id}/"""

    serializer_class = SubscriptionSerializer
    permission_classes = [IsRegisteredUser]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)


class SubscriptionCheckoutView(APIView):
    """Save collection timing; staff activates the plan after payment."""

    permission_classes = [IsRegisteredUser]

    def post(self, request, pk):
        subscription = get_object_or_404(Subscription, pk=pk, user=request.user)
        if subscription.status != Subscription.Status.PENDING:
            raise ValidationError("Only a pending (unpaid) subscription can start checkout.")

        serializer = SubscriptionCheckoutSerializer(
            data=request.data, context={"subscription": subscription}
        )
        serializer.is_valid(raise_exception=True)
        subscription.payment_option = serializer.validated_data["payment_option"]
        subscription.save(update_fields=["payment_option", "updated_at"])
        return Response(SubscriptionSerializer(subscription).data)


class SubscriptionActionView(APIView):
    """POST /api/v1/subscriptions/{id}/pause|resume|cancel/"""

    permission_classes = [IsRegisteredUser]

    # action -> (required current status or None, new status)
    TRANSITIONS = {
        "pause": (Subscription.Status.ACTIVE, Subscription.Status.PAUSED),
        "resume": (Subscription.Status.PAUSED, Subscription.Status.ACTIVE),
        "cancel": (None, Subscription.Status.CANCELLED),
    }

    def post(self, request, pk, action):
        subscription = get_object_or_404(Subscription, pk=pk, user=request.user)

        if action in ("pause", "resume") and subscription.is_recurring:
            raise ValidationError(
                "Monthly auto-billing subscriptions can't be paused/resumed here — cancel instead."
            )

        if action == "cancel":
            return self._cancel(subscription)

        required_status, new_status = self.TRANSITIONS[action]
        if subscription.status == new_status:
            raise ValidationError(f"Subscription is already {new_status}.")
        if required_status and subscription.status != required_status:
            raise ValidationError(f"Subscription must be {required_status} to {action}.")

        subscription.status = new_status
        subscription.save(update_fields=["status"])
        return Response(SubscriptionSerializer(subscription).data)

    def _cancel(self, subscription):
        if subscription.status == Subscription.Status.CANCELLED:
            raise ValidationError("Subscription is already CANCELLED.")

        if subscription.is_recurring and subscription.status == Subscription.Status.ACTIVE:
            if subscription.external_subscription_id:
                self._cancel_on_gateway(subscription)
            # Stop future renewals but let the customer keep what they
            # already paid for through end_date; a webhook or the daily
            # expire_subscriptions sweep flips this to CANCELLED/EXPIRED
            # once that date passes.
            subscription.cancel_at_period_end = True
            subscription.save(update_fields=["cancel_at_period_end"])
            return Response(SubscriptionSerializer(subscription).data)

        subscription.status = Subscription.Status.CANCELLED
        subscription.save(update_fields=["status"])
        return Response(SubscriptionSerializer(subscription).data)

    def _cancel_on_gateway(self, subscription):
        try:
            if subscription.gateway == PaymentGateway.STRIPE:
                from services.billing import stripe_gateway

                stripe_gateway.cancel_subscription(
                    subscription.external_subscription_id, at_period_end=True
                )
            elif subscription.gateway == PaymentGateway.PAYPAL:
                from services.billing import paypal_gateway

                paypal_gateway.cancel_subscription(subscription.external_subscription_id)
        except Exception:
            # Don't block the customer's cancel request on a flaky gateway
            # call — cancel_at_period_end still stops us from treating it as
            # renewed, and this is logged for ops to reconcile manually.
            import logging

            logging.getLogger(__name__).exception(
                "Failed to cancel gateway-side subscription %s (%s)",
                subscription.external_subscription_id,
                subscription.gateway,
            )


class AdminSubscriptionListView(generics.ListAPIView):
    serializer_class = AdminSubscriptionSerializer
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_MANAGE

    def get_queryset(self):
        queryset = Subscription.objects.select_related("user")
        status_filter = self.request.query_params.get("status")
        search = self.request.query_params.get("search", "").strip()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__phone_number__icontains=search)
            )
        return queryset


class AdminSubscriptionActionView(APIView):
    permission_classes = [HasStaffPermission]
    required_staff_permission = StaffPermission.FINANCE_MANAGE

    @transaction.atomic
    def post(self, request, pk):
        subscription = get_object_or_404(Subscription.objects.select_for_update(), pk=pk)
        serializer = SubscriptionAdminActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]
        from datetime import timedelta

        from django.utils import timezone

        from services.pricing import SUBSCRIPTION_PERIOD_DAYS, kg_allowance_for_plan

        if action in {"activate", "renew"}:
            subscription.status = Subscription.Status.ACTIVE
            subscription.start_date = timezone.localdate()
            subscription.end_date = subscription.start_date + timedelta(
                days=SUBSCRIPTION_PERIOD_DAYS
            )
            subscription.kg_remaining = kg_allowance_for_plan(subscription.plan)
        elif action == "pause":
            subscription.status = Subscription.Status.PAUSED
        elif action == "resume":
            subscription.status = Subscription.Status.ACTIVE
        elif action == "cancel":
            subscription.status = Subscription.Status.CANCELLED
        elif action == "adjust_kilos":
            subscription.kg_remaining = serializer.validated_data["kilos"]
        subscription.save()
        return Response(AdminSubscriptionSerializer(subscription).data)
