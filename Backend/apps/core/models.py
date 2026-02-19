from django.conf import settings
from django.db import models


class Group(models.Model):
    name = models.CharField(max_length=255)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Subject(models.Model):
    name = models.CharField(max_length=255)
    is_demo = models.BooleanField(default=False)

    def __str__(self):
        return self.name


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


class ModuleSubjectConfig(models.Model):
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="subject_configs")
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="module_configs")
    question_count = models.PositiveIntegerField(default=5)

    class Meta:
        unique_together = ("module", "subject")


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


class TestResult(models.Model):
    participant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="results")
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="results")
    group = models.ForeignKey(Group, null=True, blank=True, on_delete=models.SET_NULL, related_name="results")
    correct_answers = models.PositiveIntegerField(default=0)
    total_questions = models.PositiveIntegerField(default=0)
    score = models.PositiveIntegerField(default=0)
    is_passed = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now_add=True)
    time_taken = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-date"]
