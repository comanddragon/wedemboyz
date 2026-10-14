from rest_framework import serializers

from apps.orders.models import Order, PickupDeliverySchedule


class ScheduleSerializer(serializers.ModelSerializer):
    """GET/PATCH shape for an existing schedule. Dates/slots are editable
    directly here; status transitions go through the reschedule action so
    RESCHEDULED gets set consistently."""

    class Meta:
        model = PickupDeliverySchedule
        fields = [
            "order",
            "pickup_date",
            "pickup_time_slot",
            "pickup_status",
            "delivery_date",
            "delivery_time_slot",
            "delivery_status",
            "driver_notes",
        ]
        read_only_fields = ["order", "pickup_status", "delivery_status"]


class ScheduleCreateSerializer(serializers.ModelSerializer):
    order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())

    class Meta:
        model = PickupDeliverySchedule
        fields = ["order", "pickup_date", "pickup_time_slot", "delivery_date", "delivery_time_slot", "driver_notes"]

    def validate_order(self, order):
        user = self.context["request"].user
        if order.user_id != user.id and not user.is_staff:
            raise serializers.ValidationError("You do not own this order.")
        if hasattr(order, "schedule"):
            raise serializers.ValidationError("This order already has a schedule.")
        return order


class RescheduleSerializer(serializers.Serializer):
    """Partial update used by the /reschedule/ action — any field changed
    here bumps the corresponding status to RESCHEDULED."""

    pickup_date = serializers.DateField(required=False)
    pickup_time_slot = serializers.ChoiceField(choices=PickupDeliverySchedule.TimeSlot.choices, required=False)
    delivery_date = serializers.DateField(required=False)
    delivery_time_slot = serializers.ChoiceField(choices=PickupDeliverySchedule.TimeSlot.choices, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide at least one field to reschedule.")
        return attrs

    def save(self, **kwargs):
        schedule = self.context["schedule"]

        for attr, value in self.validated_data.items():
            setattr(schedule, attr, value)

        if "pickup_date" in self.validated_data or "pickup_time_slot" in self.validated_data:
            schedule.pickup_status = PickupDeliverySchedule.Status.RESCHEDULED
        if "delivery_date" in self.validated_data or "delivery_time_slot" in self.validated_data:
            schedule.delivery_status = PickupDeliverySchedule.Status.RESCHEDULED

        schedule.save()
        return schedule
