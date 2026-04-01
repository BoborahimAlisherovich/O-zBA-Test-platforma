# from django.contrib.auth.models import AbstractUser
# from django.db import models


# class UserRole(models.TextChoices):
#     ADMIN = "ADMIN", "ADMIN"
#     MANAGER = "MANAGER", "MANAGER"
#     PARTICIPANT = "TINGLOVCHI", "TINGLOVCHI"


# class User(AbstractUser):
#     full_name = models.CharField(max_length=255)
#     workplace = models.CharField(max_length=255, blank=True)
#     role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.PARTICIPANT)
#     group = models.ForeignKey("core.Group", null=True, blank=True, on_delete=models.SET_NULL, related_name="users")

#     def __str__(self):
#         return f"{self.username} ({self.role})"
        
        
from django.contrib.auth.models import AbstractUser
from django.db import models


class UserRole(models.TextChoices):
    ADMIN = "ADMIN", "ADMIN"
    MANAGER = "MANAGER", "MANAGER"
    PARTICIPANT = "TINGLOVCHI", "TINGLOVCHI"


class User(AbstractUser):
    full_name = models.CharField(max_length=255)
    workplace = models.CharField(max_length=255, blank=True)
    profile_photo = models.ImageField(upload_to="profile_photos/", blank=True, null=True)
    is_archived = models.BooleanField(default=False)
    group = models.ForeignKey(
        "core.Group",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="users",
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.PARTICIPANT
    )

    def __str__(self):
        return f"{self.username} ({self.role})"

    class Meta:
        indexes = [
            models.Index(fields=["role"]),
            models.Index(fields=["group", "role"]),
            models.Index(fields=["is_archived", "role"]),
        ]
