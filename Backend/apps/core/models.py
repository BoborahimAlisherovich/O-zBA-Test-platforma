from django.conf import settings
from django.db import models
from django.utils import timezone
import uuid


class Group(models.Model):
    name = models.CharField(max_length=255)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        indexes = [
            models.Index(fields=["is_archived"]),
            models.Index(fields=["name"]),
        ]


class Subject(models.Model):
    name = models.CharField(max_length=255)
    is_demo = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    class Meta:
        indexes = [
            models.Index(fields=["is_demo", "name"]),
        ]


class Module(models.Model):
    name = models.CharField(max_length=255)
    is_demo = models.BooleanField(default=False)
    groups = models.ManyToManyField(Group, related_name="modules", blank=True)

    points_per_answer = models.PositiveIntegerField(default=5)
    duration_minutes = models.PositiveIntegerField(default=30)
    passing_score = models.PositiveIntegerField(default=60)
    randomize = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        indexes = [
            models.Index(fields=["is_demo", "is_active"]),
            models.Index(fields=["name"]),
        ]


class ModuleSubjectConfig(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="subject_configs")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="module_configs")
    question_count = models.PositiveIntegerField(default=5)

    class Meta:
        unique_together = ("module", "subject")
        indexes = [
            models.Index(fields=["subject", "module"]),
        ]


class Question(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    option_a = models.CharField(max_length=500)
    option_b = models.CharField(max_length=500)
    option_c = models.CharField(max_length=500)
    option_d = models.CharField(max_length=500)
    correct_index = models.PositiveSmallIntegerField(default=0)

    def options(self):
        return [self.option_a, self.option_b, self.option_c, self.option_d]

    class Meta:
        indexes = [
            models.Index(fields=["subject", "id"]),
        ]


class TestResult(models.Model):
    participant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="results")
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="results")
    group = models.ForeignKey(Group, null=True, blank=True, on_delete=models.SET_NULL, related_name="results")
    attempt = models.OneToOneField("TestAttempt", null=True, blank=True, on_delete=models.SET_NULL, related_name="result")
    correct_answers = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)
    score = models.PositiveIntegerField(default=0)
    is_passed = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now_add=True)
    time_taken = models.PositiveIntegerField(null=True, blank=True)
    archive_folder = models.ForeignKey("ResultArchiveFolder", null=True, blank=True, on_delete=models.SET_NULL, related_name="results")

    class Meta:
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["participant", "module"]),
            models.Index(fields=["group", "date"]),
            models.Index(fields=["module", "date"]),
            models.Index(fields=["archive_folder", "date"]),
        ]


class ResultArchiveFolder(models.Model):
    name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return self.name


class TestAttempt(models.Model):
    participant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="test_attempts")
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="test_attempts")
    group = models.ForeignKey(Group, null=True, blank=True, on_delete=models.SET_NULL, related_name="test_attempts")
    attempt_key = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    question_payload = models.JSONField(default=list, blank=True)
    answers = models.JSONField(default=dict, blank=True)
    current_question_index = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    remaining_seconds = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-started_at"]
        indexes = [
            models.Index(fields=["participant", "completed_at", "updated_at"]),
            models.Index(fields=["participant", "module", "completed_at"]),
            models.Index(fields=["expires_at", "completed_at"]),
        ]

    def __str__(self):
        return f"Attempt #{self.pk} - {self.participant} - {self.module}"


class SiteSetting(models.Model):
    login_logo = models.TextField(blank=True)
    sidebar_logo = models.TextField(blank=True)
    login_logo_file = models.ImageField(upload_to="branding/", blank=True, null=True)
    sidebar_logo_file = models.ImageField(upload_to="branding/", blank=True, null=True)
    site_title = models.CharField(max_length=255, blank=True)
    site_subtitle = models.CharField(max_length=255, blank=True)
    demo_max_attempts = models.PositiveIntegerField(default=5)

    def __str__(self):
        return f"Site settings #{self.pk}"
