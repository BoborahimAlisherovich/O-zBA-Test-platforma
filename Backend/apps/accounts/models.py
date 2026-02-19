from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    ADMIN = "ADMIN", "ADMIN"
    MANAGER = "MANAGER", "MANAGER"
    PARTICIPANT = "TINGLOVCHI", "TINGLOVCHI"


class User(AbstractUser):
    full_name = models.CharField(max_length=255)
    workplace = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.PARTICIPANT)
    group = models.ForeignKey("core.Group", null=True, blank=True, on_delete=models.SET_NULL, related_name="users")

    def __str__(self):
        return f"{self.username} ({self.role})"
