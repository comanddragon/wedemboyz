from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.staff.models import StaffActivityLog, StaffInvite, StaffProfile

User = get_user_model()


class StaffUserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "phone_number", "email"]
        read_only_fields = fields


class StaffProfileSerializer(serializers.ModelSerializer):
    """GET /api/v1/staff/ and /api/v1/staff/{id}/ — the roster."""

    user = StaffUserSummarySerializer(read_only=True)
    invited_by = StaffUserSummarySerializer(read_only=True)

    class Meta:
        model = StaffProfile
        fields = ["id", "user", "role", "is_active", "invited_by", "joined_at"]
        read_only_fields = ["id", "user", "invited_by", "joined_at"]


class StaffProfileUpdateSerializer(serializers.ModelSerializer):
    """PATCH /api/v1/staff/{id}/ — role/active-status changes only."""

    class Meta:
        model = StaffProfile
        fields = ["role", "is_active"]


class StaffInviteSerializer(serializers.ModelSerializer):
    invited_by = StaffUserSummarySerializer(read_only=True)
    is_valid_now = serializers.SerializerMethodField()

    class Meta:
        model = StaffInvite
        fields = [
            "id",
            "phone_number",
            "full_name",
            "role",
            "token",
            "status",
            "invited_by",
            "expires_at",
            "is_valid_now",
            "created_at",
        ]
        read_only_fields = ["id", "token", "status", "invited_by", "is_valid_now", "created_at"]

    def get_is_valid_now(self, obj):
        return obj.is_valid_now()

    def create(self, validated_data):
        return StaffInvite.objects.create(
            invited_by=self.context["request"].user, **validated_data
        )


class StaffInviteAcceptSerializer(serializers.Serializer):
    """POST /api/v1/staff/invites/accept/ — public endpoint, token-gated."""

    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    def validate_token(self, value):
        try:
            invite = StaffInvite.objects.get(token=value)
        except StaffInvite.DoesNotExist:
            raise serializers.ValidationError("Invalid invite token.")

        if not invite.is_valid_now():
            raise serializers.ValidationError("This invite has expired or was already used.")

        self._invite = invite
        return value

    def save(self, **kwargs):
        invite = self._invite
        first_name = self.validated_data.get("first_name", "") or invite.full_name.split(" ")[0]
        last_name = self.validated_data.get("last_name", "") or " ".join(
            invite.full_name.split(" ")[1:]
        )

        user, created = User.objects.get_or_create(
            phone_number=invite.phone_number,
            defaults={"first_name": first_name, "last_name": last_name, "is_staff": True},
        )
        user.is_staff = True
        user.first_name = first_name or user.first_name
        user.last_name = last_name or user.last_name
        user.set_password(self.validated_data["password"])
        user.save()

        StaffProfile.objects.update_or_create(
            user=user,
            defaults={"role": invite.role, "is_active": True, "invited_by": invite.invited_by},
        )

        invite.status = StaffInvite.Status.ACCEPTED
        invite.accepted_by = user
        invite.save(update_fields=["status", "accepted_by"])

        return user


class StaffActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffActivityLog
        fields = ["id", "action", "description", "created_at"]
        read_only_fields = fields
