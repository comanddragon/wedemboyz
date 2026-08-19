from rest_framework import generics, permissions, status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.api.serializers.device_token import DeviceTokenSerializer
from apps.notifications.models import DeviceToken


class DeviceTokenListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/notifications/device-tokens/ — register this
    device for push notifications. Call again (e.g. on every app launch)
    to keep the token fresh; re-registering an existing token just updates
    it rather than erroring."""

    serializer_class = DeviceTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DeviceToken.objects.filter(user=self.request.user, is_active=True)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        device_token = serializer.save()
        return Response(DeviceTokenSerializer(device_token).data, status=status.HTTP_201_CREATED)


class DeviceTokenDeleteView(APIView):
    """DELETE /api/v1/notifications/device-tokens/{id}/ — call on logout so
    a shared/reset device stops receiving this user's pushes."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        token = get_object_or_404(DeviceToken, pk=pk, user=request.user)
        token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
