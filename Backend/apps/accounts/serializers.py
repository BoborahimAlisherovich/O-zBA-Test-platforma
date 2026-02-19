from django.contrib.auth import authenticate
from rest_framework import serializers

from .models import User, UserRole


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    fullName = serializers.CharField(source="full_name")
    groupId = serializers.IntegerField(source="group_id", required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["id", "fullName", "username", "password", "workplace", "role", "groupId"]

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
        user = authenticate(username=attrs.get("username"), password=attrs.get("password"))
        if not user:
            raise serializers.ValidationError("Login yoki parol xato")
        if not user.is_active:
            raise serializers.ValidationError("Foydalanuvchi nofaol")
        attrs["user"] = user
        return attrs
