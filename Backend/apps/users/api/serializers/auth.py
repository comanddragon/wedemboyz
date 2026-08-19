from django.contrib.auth import password_validation
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.users.models import CustomUser
from typing import Any, Dict


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8, label="Confirm password")

    class Meta:
        model = CustomUser
        fields = ["phone_number", "first_name", "last_name", "email", "password", "password2"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password2"):
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        password_validation.validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return CustomUser.objects.create_user(password=password, **validated_data)


class LoginSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user: CustomUser):
        token = super().get_token(user)
        token["phone_number"] = user.phone_number
        return token

    def validate(self, attrs):
        phone_field = self.username_field

        if phone_field in attrs:
            from core.utils import format_phone_number

            attrs[phone_field] = format_phone_number(attrs[phone_field])

        data = super().validate(attrs)
        data: Dict[str, Any] = data
        data["user"] = {
            "id": self.user.pk,
            "phone_number": self.user.phone_number,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "is_staff": self.user.is_staff,   # ADD THIS
        }

        return data

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
