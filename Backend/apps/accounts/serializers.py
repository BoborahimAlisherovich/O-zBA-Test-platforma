import logging

from django.contrib.auth import authenticate
from django.core.exceptions import DisallowedHost
from rest_framework import serializers

from .models import User, UserRole

logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    fullName = serializers.CharField(source="full_name")
    groupId = serializers.IntegerField(source="group_id", required=False, allow_null=True)
    isArchived = serializers.BooleanField(source="is_archived", required=False)
    profilePhoto = serializers.SerializerMethodField()
    profilePhotoFile = serializers.ImageField(source="profile_photo", write_only=True, required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["id", "fullName", "username", "password", "workplace", "role", "groupId", "isArchived", "profilePhoto", "profilePhotoFile"]

    def _absolute_or_relative(self, url):
        request = self.context.get("request")
        if not request:
            return url
        try:
            return request.build_absolute_uri(url)
        except DisallowedHost:
            return url

    def get_profilePhoto(self, obj):
        if obj.profile_photo:
            return self._absolute_or_relative(obj.profile_photo.url)
        return ""

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source="full_name")
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "password", "fullName", "workplace"]

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            full_name=validated_data["full_name"],
            workplace=validated_data.get("workplace", ""),
            role=UserRole.PARTICIPANT,
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        username = attrs.get("username")
        user = authenticate(username=username, password=attrs.get("password"))
        if not user:
            logger.warning("Login rejected: invalid credentials", extra={"username": username})
            raise serializers.ValidationError("Login yoki parol xato")
        if not user.is_active:
            logger.warning("Login rejected: inactive user", extra={"username": username, "user_id": user.id})
            raise serializers.ValidationError("Foydalanuvchi nofaol")
        attrs["user"] = user
        return attrs
