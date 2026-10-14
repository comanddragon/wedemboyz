from rest_framework import serializers

from apps.notifications.models import DeviceToken


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ["id", "token", "platform", "is_active", "created_at"]
        read_only_fields = ["id", "is_active", "created_at"]

    def create(self, validated_data):
        # Re-registering an existing token (app reinstall, token refresh)
        # updates it to the current user rather than erroring on the
        # unique constraint — a token belongs to whoever registered it last.
        token = validated_data["token"]
        user = self.context["request"].user
        device_token, _ = DeviceToken.objects.update_or_create(
            token=token,
            defaults={
                "user": user,
                "platform": validated_data["platform"],
                "is_active": True,
            },
        )
        return device_token
