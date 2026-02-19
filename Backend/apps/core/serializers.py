from django.db import transaction
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from .models import Group, Module, ModuleSubjectConfig, Question, Subject, TestResult


def _to_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


class GroupSerializer(serializers.ModelSerializer):
    moduleIds = serializers.PrimaryKeyRelatedField(source="modules", many=True, queryset=Module.objects.all(), required=False)
    isArchived = serializers.BooleanField(source="is_archived", required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Group
        fields = ["id", "name", "isArchived", "createdAt", "moduleIds"]


class SubjectSerializer(serializers.ModelSerializer):
    isDemo = serializers.BooleanField(source="is_demo", required=False)

    class Meta:
        model = Subject
        fields = ["id", "name", "isDemo"]


class ModuleSubjectConfigSerializer(serializers.ModelSerializer):
    subjectId = serializers.IntegerField(source="subject_id")
    questionCount = serializers.IntegerField(source="question_count")

    class Meta:
        model = ModuleSubjectConfig
        fields = ["id", "subjectId", "questionCount"]


class ModuleSerializer(serializers.ModelSerializer):
    groupIds = serializers.PrimaryKeyRelatedField(source="groups", many=True, queryset=Group.objects.all(), required=False)
    subjectConfigs = ModuleSubjectConfigSerializer(source="subject_configs", many=True, required=False)
    isDemo = serializers.BooleanField(source="is_demo", required=False)
    settings = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ["id", "name", "isDemo", "groupIds", "subjectConfigs", "settings"]

    def get_settings(self, obj):
        return {
            "pointsPerAnswer": obj.points_per_answer,
            "durationMinutes": obj.duration_minutes,
            "passingScore": obj.passing_score,
            "randomize": obj.randomize,
            "isActive": obj.is_active,
        }

    @transaction.atomic
    def create(self, validated_data):
        groups = validated_data.pop("groups", [])
        configs = validated_data.pop("subject_configs", [])
        settings = self.initial_data.get("settings", {})
        module = Module.objects.create(
            **validated_data,
            points_per_answer=int(settings.get("pointsPerAnswer", 5)),
            duration_minutes=int(settings.get("durationMinutes", 30)),
            passing_score=int(settings.get("passingScore", 60)),
            randomize=_to_bool(settings.get("randomize"), True),
            is_active=_to_bool(settings.get("isActive"), True),
        )
        if groups:
            module.groups.set(groups)
        for cfg in configs:
            ModuleSubjectConfig.objects.create(module=module, **cfg)
        return module

    @transaction.atomic
    def update(self, instance, validated_data):
        groups = validated_data.pop("groups", None)
        configs = validated_data.pop("subject_configs", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        settings = self.initial_data.get("settings", {})
        if settings:
            instance.points_per_answer = int(settings.get("pointsPerAnswer", instance.points_per_answer))
            instance.duration_minutes = int(settings.get("durationMinutes", instance.duration_minutes))
            instance.passing_score = int(settings.get("passingScore", instance.passing_score))
            instance.randomize = _to_bool(settings.get("randomize"), instance.randomize)
            instance.is_active = _to_bool(settings.get("isActive"), instance.is_active)
        instance.save()
        if groups is not None:
            instance.groups.set(groups)

        if configs is not None:
            instance.subject_configs.all().delete()
            for cfg in configs:
                ModuleSubjectConfig.objects.create(module=instance, **cfg)
        return instance


class QuestionSerializer(serializers.ModelSerializer):
    subjectId = serializers.IntegerField(source="subject_id")
    options = serializers.ListField(child=serializers.CharField(), min_length=4, max_length=4)
    correctIndex = serializers.IntegerField(source="correct_index")

    class Meta:
        model = Question
        fields = ["id", "subjectId", "text", "options", "correctIndex"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["options"] = [instance.option_a, instance.option_b, instance.option_c, instance.option_d]
        return data

    def create(self, validated_data):
        options = validated_data.pop("options")
        return Question.objects.create(
            **validated_data,
            option_a=options[0],
            option_b=options[1],
            option_c=options[2],
            option_d=options[3],
        )

    def update(self, instance, validated_data):
        options = validated_data.pop("options", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if options:
            instance.option_a = options[0]
            instance.option_b = options[1]
            instance.option_c = options[2]
            instance.option_d = options[3]
        instance.save()
        return instance


class TestResultSerializer(serializers.ModelSerializer):
    participantId = serializers.IntegerField(source="participant_id", read_only=True)
    moduleId = serializers.IntegerField(source="module_id", read_only=True)
    groupId = serializers.IntegerField(source="group_id", read_only=True)
    isPassed = serializers.BooleanField(source="is_passed", read_only=True)
    totalQuestions = serializers.IntegerField(source="total_questions", read_only=True)
    correctAnswers = serializers.IntegerField(source="correct_answers", read_only=True)
    timeTaken = serializers.IntegerField(source="time_taken", read_only=True)

    class Meta:
        model = TestResult
        fields = [
            "id",
            "participantId",
            "moduleId",
            "groupId",
            "correctAnswers",
            "totalQuestions",
            "score",
            "isPassed",
            "date",
            "timeTaken",
        ]


class SnapshotSerializer(serializers.Serializer):
    users = UserSerializer(many=True)
    groups = GroupSerializer(many=True)
    subjects = SubjectSerializer(many=True)
    modules = ModuleSerializer(many=True)
    questions = QuestionSerializer(many=True)
    results = TestResultSerializer(many=True)
    demoSubjects = SubjectSerializer(many=True)
    demoModules = ModuleSerializer(many=True)
    demoQuestions = QuestionSerializer(many=True)
    demoResults = TestResultSerializer(many=True)
