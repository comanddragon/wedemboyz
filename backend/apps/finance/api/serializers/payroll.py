from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.finance.models import PayrollEntry
User = get_user_model()


class PayrollEmployeeSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="staff_profile.role", read_only=True)

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "phone_number", "role"]


class PayrollEntrySerializer(serializers.ModelSerializer):
    employee_detail = PayrollEmployeeSerializer(source="employee", read_only=True)

    class Meta:
        model = PayrollEntry
        fields = [
            "id", "employee", "employee_detail", "pay_period", "amount",
            "currency", "status", "paid_on", "notes", "created_by", "created_at",
        ]
        read_only_fields = ["id", "employee_detail", "created_by", "created_at"]

    def validate_employee(self, user):
        profile = getattr(user, "staff_profile", None)
        if not user.is_staff or not profile or not profile.is_active:
            raise serializers.ValidationError("Payroll can only be recorded for active staff.")
        return user

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", PayrollEntry.Status.PENDING))
        paid_on = attrs.get("paid_on", getattr(self.instance, "paid_on", None))
        if status == PayrollEntry.Status.PAID and not paid_on:
            raise serializers.ValidationError({"paid_on": "A payment date is required when marking salary as paid."})
        if status == PayrollEntry.Status.PENDING:
            attrs["paid_on"] = None
        return attrs

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
