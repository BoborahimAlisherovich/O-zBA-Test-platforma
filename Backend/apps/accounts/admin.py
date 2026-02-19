from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ("id", "username", "full_name", "role", "group", "is_active")
    fieldsets = UserAdmin.fieldsets + (("Extra", {"fields": ("full_name", "workplace", "role", "group")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Extra", {"fields": ("full_name", "workplace", "role", "group")}),)
