from django.utils import timezone
from django.db import transaction
from django.core.exceptions import DisallowedHost
from rest_framework import serializers

from apps.accounts.serializers import UserSerializer
from .models import Group, Module, ModuleSubjectConfig, Question, ResultArchiveFolder, SiteSetting, Subject, TestAttempt, TestResult


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


class ParticipantQuestionSerializer(serializers.ModelSerializer):
    subjectId = serializers.IntegerField(source="subject_id")
    options = serializers.ListField(child=serializers.CharField(), min_length=4, max_length=4)

    class Meta:
        model = Question
        fields = ["id", "subjectId", "text", "options"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["options"] = [instance.option_a, instance.option_b, instance.option_c, instance.option_d]
        return data


class TestResultSerializer(serializers.ModelSerializer):
    participantId = serializers.IntegerField(source="participant_id", read_only=True)
    moduleId = serializers.IntegerField(source="module_id", read_only=True)
    groupId = serializers.IntegerField(source="group_id", read_only=True)
    attemptId = serializers.IntegerField(source="attempt_id", read_only=True)
    isPassed = serializers.BooleanField(source="is_passed", read_only=True)
    totalQuestions = serializers.IntegerField(source="total_questions", read_only=True)
    correctAnswers = serializers.IntegerField(source="correct_answers", read_only=True)
    timeTaken = serializers.IntegerField(source="time_taken", read_only=True)
    archiveFolderId = serializers.IntegerField(source="archive_folder_id", read_only=False, required=False, allow_null=True)

    class Meta:
        model = TestResult
        fields = [
            "id",
            "participantId",
            "moduleId",
            "groupId",
            "attemptId",
            "correctAnswers",
            "totalQuestions",
            "score",
            "isPassed",
            "date",
            "timeTaken",
            "archiveFolderId",
        ]


class ResultArchiveFolderSerializer(serializers.ModelSerializer):
    resultIds = serializers.PrimaryKeyRelatedField(source="results", many=True, read_only=True)
    resultsCount = serializers.SerializerMethodField()

    class Meta:
        model = ResultArchiveFolder
        fields = ["id", "name", "created_at", "resultIds", "resultsCount"]

    def get_resultsCount(self, obj):
        return obj.results.count()


class TestAttemptSerializer(serializers.ModelSerializer):
    participantId = serializers.IntegerField(source="participant_id", read_only=True)
    moduleId = serializers.IntegerField(source="module_id", read_only=True)
    groupId = serializers.IntegerField(source="group_id", read_only=True)
    moduleName = serializers.CharField(source="module.name", read_only=True)
    isDemo = serializers.BooleanField(source="module.is_demo", read_only=True)
    attemptKey = serializers.UUIDField(source="attempt_key", read_only=True)
    questions = serializers.JSONField(source="question_payload", read_only=True)
    currentQuestionIndex = serializers.IntegerField(source="current_question_index", read_only=True)
    startedAt = serializers.DateTimeField(source="started_at", read_only=True)
    expiresAt = serializers.DateTimeField(source="expires_at", read_only=True)
    completedAt = serializers.DateTimeField(source="completed_at", read_only=True)
    timeRemaining = serializers.SerializerMethodField()
    settings = serializers.SerializerMethodField()

    class Meta:
        model = TestAttempt
        fields = [
            "id",
            "participantId",
            "moduleId",
            "groupId",
            "moduleName",
            "isDemo",
            "attemptKey",
            "questions",
            "answers",
            "currentQuestionIndex",
            "startedAt",
            "expiresAt",
            "completedAt",
            "timeRemaining",
            "settings",
        ]

    def get_timeRemaining(self, obj):
        return max(0, int(obj.remaining_seconds or 0))

    def get_settings(self, obj):
        return {
            "pointsPerAnswer": obj.module.points_per_answer,
            "durationMinutes": obj.module.duration_minutes,
            "passingScore": obj.module.passing_score,
            "randomize": obj.module.randomize,
            "isActive": obj.module.is_active,
        }


class SiteSettingSerializer(serializers.ModelSerializer):
    loginLogo = serializers.SerializerMethodField()
    sidebarLogo = serializers.SerializerMethodField()
    loginLogoFile = serializers.ImageField(source="login_logo_file", write_only=True, required=False, allow_null=True)
    sidebarLogoFile = serializers.ImageField(source="sidebar_logo_file", write_only=True, required=False, allow_null=True)
    siteTitle = serializers.CharField(source="site_title", allow_blank=True, required=False)
    siteSubtitle = serializers.CharField(source="site_subtitle", allow_blank=True, required=False)
    demoMaxAttempts = serializers.IntegerField(source="demo_max_attempts", required=False, min_value=1)
    clearLoginLogo = serializers.BooleanField(write_only=True, required=False, default=False)
    clearSidebarLogo = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = SiteSetting
        fields = [
            "loginLogo",
            "sidebarLogo",
            "loginLogoFile",
            "sidebarLogoFile",
            "siteTitle",
            "siteSubtitle",
            "demoMaxAttempts",
            "clearLoginLogo",
            "clearSidebarLogo",
        ]

    def _absolute_or_relative(self, url):
        request = self.context.get("request")
        if not request:
            return url
        try:
            return request.build_absolute_uri(url)
        except DisallowedHost:
            return url

    def get_loginLogo(self, obj):
        if obj.login_logo_file:
            return self._absolute_or_relative(obj.login_logo_file.url)
        return ""

    def get_sidebarLogo(self, obj):
        if obj.sidebar_logo_file:
            return self._absolute_or_relative(obj.sidebar_logo_file.url)
        return ""

    def update(self, instance, validated_data):
        clear_login = validated_data.pop("clearLoginLogo", False)
        clear_sidebar = validated_data.pop("clearSidebarLogo", False)
        login_logo_file = validated_data.pop("login_logo_file", serializers.empty)
        sidebar_logo_file = validated_data.pop("sidebar_logo_file", serializers.empty)

        if clear_login and instance.login_logo_file:
            instance.login_logo_file.delete(save=False)
            instance.login_logo_file = None
        if clear_sidebar and instance.sidebar_logo_file:
            instance.sidebar_logo_file.delete(save=False)
            instance.sidebar_logo_file = None
        if login_logo_file is not serializers.empty:
            if instance.login_logo_file:
                instance.login_logo_file.delete(save=False)
            instance.login_logo_file = login_logo_file
        if sidebar_logo_file is not serializers.empty:
            if instance.sidebar_logo_file:
                instance.sidebar_logo_file.delete(save=False)
            instance.sidebar_logo_file = sidebar_logo_file

        # Legacy base64 fields are intentionally kept empty after file migration.
        instance.login_logo = ""
        instance.sidebar_logo = ""
        return super().update(instance, validated_data)


class SnapshotSerializer(serializers.Serializer):
    users = UserSerializer(many=True)
    archivedUsers = UserSerializer(many=True)
    groups = GroupSerializer(many=True)
    subjects = SubjectSerializer(many=True)
    modules = ModuleSerializer(many=True)
    questions = QuestionSerializer(many=True)
    results = TestResultSerializer(many=True)
    archivedResults = TestResultSerializer(many=True)
    resultArchiveFolders = ResultArchiveFolderSerializer(many=True)
    demoSubjects = SubjectSerializer(many=True)
    demoModules = ModuleSerializer(many=True)
    demoQuestions = QuestionSerializer(many=True)
    demoResults = TestResultSerializer(many=True)
    siteSettings = SiteSettingSerializer()


class ParticipantSnapshotSerializer(serializers.Serializer):
    users = UserSerializer(many=True)
    archivedUsers = UserSerializer(many=True)
    groups = GroupSerializer(many=True)
    subjects = SubjectSerializer(many=True)
    modules = ModuleSerializer(many=True)
    questions = ParticipantQuestionSerializer(many=True)
    results = TestResultSerializer(many=True)
    archivedResults = TestResultSerializer(many=True)
    resultArchiveFolders = ResultArchiveFolderSerializer(many=True)
    demoSubjects = SubjectSerializer(many=True)
    demoModules = ModuleSerializer(many=True)
    demoQuestions = ParticipantQuestionSerializer(many=True)
    demoResults = TestResultSerializer(many=True)
    siteSettings = SiteSettingSerializer()
