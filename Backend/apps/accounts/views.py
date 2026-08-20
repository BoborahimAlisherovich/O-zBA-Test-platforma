import logging

from django.conf import settings
from django.core.cache import cache
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .permissions import IsAdminRole
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

logger = logging.getLogger(__name__)


def _client_ip(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def _login_throttle_state(request, username):
    client_ip = _client_ip(request)
    window = max(60, int(settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS))
    attempts = max(1, int(settings.LOGIN_RATE_LIMIT_ATTEMPTS))
    cache_key = f"login-throttle:{client_ip}:{username.lower()}"
    failures = cache.get(cache_key, 0)
    return cache_key, failures, attempts, window


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related("group").all().order_by("-id")
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    if not settings.ENABLE_PUBLIC_REGISTRATION:
        return Response(
            {"detail": "Ochiq ro'yxatdan o'tish o'chirilgan."},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    username = str(request.data.get("username", "")).strip()
    throttle_key, failures, max_attempts, window = _login_throttle_state(request, username)
    if failures >= max_attempts:
        logger.warning("Login blocked by throttle", extra={"username": username, "path": request.path, "client_ip": _client_ip(request)})
        return Response(
            {"detail": "Juda ko'p login urinishlari. Bir necha daqiqadan keyin qayta urinib ko'ring."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    logger.info("Login attempt received", extra={"username": username, "path": request.path, "client_ip": _client_ip(request)})
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        cache.set(throttle_key, failures + 1, timeout=window)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.validated_data["user"]
    cache.delete(throttle_key)
    logger.info("Login succeeded", extra={"username": user.username, "user_id": user.id, "path": request.path, "client_ip": _client_ip(request)})

    refresh = RefreshToken.for_user(user)
    return Response(
        {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": UserSerializer(user).data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)
