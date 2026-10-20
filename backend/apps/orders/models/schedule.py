from django.db import models
from django.conf import settings

from core.models import TimeStampedModel

from .order import Order


class PickupDeliverySchedule(TimeStampedModel):
    class TimeSlot(models.TextChoices):
        MORNING = "MORNING", "8:00 - 11:00"
        MIDDAY = "MIDDAY", "11:00 - 14:00"
        AFTERNOON = "AFTERNOON", "14:00 - 17:00"
        EVENING = "EVENING", "17:00 - 19:00"

    class Status(models.TextChoices):
        SCHEDULED = "SCHEDULED", "Scheduled"
        RESCHEDULED = "RESCHEDULED", "Rescheduled"
        COMPLETED = "COMPLETED", "Completed"
        MISSED = "MISSED", "Missed"

    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name="schedule"
    )

    pickup_date = models.DateField()
    pickup_time_slot = models.CharField(max_length=10, choices=TimeSlot.choices)
    pickup_status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.SCHEDULED
    )

    delivery_date = models.DateField()
    delivery_time_slot = models.CharField(max_length=10, choices=TimeSlot.choices)
    delivery_status = models.CharField(
        max_length=12, choices=Status.choices, default=Status.SCHEDULED
    )

    driver_notes = models.TextField(blank=True)
    driver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="delivery_schedules",
    )
    pickup_completed_at = models.DateTimeField(null=True, blank=True)
    delivery_completed_at = models.DateTimeField(null=True, blank=True)
    proof_of_delivery = models.ImageField(upload_to="orders/proof/%Y/%m/", null=True, blank=True)
    failed_reason = models.CharField(max_length=255, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    address_override = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["pickup_date"]

    def __str__(self):
        return f"Schedule<Order #{self.order_id}> pickup {self.pickup_date}"
