from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import User
from .models import Group, Module, Question, Subject, TestResult
from .models import ModuleSubjectConfig
from .permissions import IsAdminOnly, IsParticipantOnly
from .serializers import (
    GroupSerializer,
    ModuleSerializer,
    QuestionSerializer,
    SnapshotSerializer,
    SubjectSerializer,
    TestResultSerializer,
)
from .services import pick_questions_for_module

DEMO_MAX_ATTEMPTS = 5


def _to_bool(v, default=False):
    if v is None:
        return default
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.strip().lower() in {"1", "true", "yes", "on"}
    return bool(v)


def _to_int(v, default=None):
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


class GroupViewSet(viewsets.ModelViewSet):
    queryset = Group.objects.prefetch_related("modules").all().order_by("-id")
    serializer_class = GroupSerializer
    permission_classes = [IsAdminOnly]


class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        is_demo = self.request.query_params.get("is_demo")
        qs = Subject.objects.all().order_by("-id")
        if is_demo is not None:
            qs = qs.filter(is_demo=str(is_demo).lower() in {"1", "true", "yes"})
        return qs

    def perform_create(self, serializer):
        is_demo = self.request.query_params.get("is_demo")
        if is_demo is None:
            serializer.save()
            return
        serializer.save(is_demo=str(is_demo).lower() in {"1", "true", "yes"})


class ModuleViewSet(viewsets.ModelViewSet):
    serializer_class = ModuleSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        is_demo = self.request.query_params.get("is_demo")
        qs = Module.objects.prefetch_related("groups", "subject_configs").all().order_by("-id")
        if is_demo is not None:
            qs = qs.filter(is_demo=str(is_demo).lower() in {"1", "true", "yes"})
        return qs

    def perform_create(self, serializer):
        is_demo = self.request.query_params.get("is_demo")
        if is_demo is None:
            serializer.save()
            return
        serializer.save(is_demo=str(is_demo).lower() in {"1", "true", "yes"})


class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        qs = Question.objects.select_related("subject").all().order_by("-id")
        is_demo = self.request.query_params.get("is_demo")
        subject_id = self.request.query_params.get("subject_id")
        if is_demo is not None:
            qs = qs.filter(subject__is_demo=str(is_demo).lower() in {"1", "true", "yes"})
        if subject_id:
            qs = qs.filter(subject_id=subject_id)
        return qs


class TestResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TestResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = TestResult.objects.select_related("participant", "module", "group").all()
        user = self.request.user
        if user.role in {"ADMIN", "MANAGER"}:
            return qs
        return qs.filter(participant=user)


def _build_snapshot_payload(user):
    if user.role in {"ADMIN", "MANAGER"}:
        users = User.objects.select_related("group").all().order_by("-id")
        groups = Group.objects.prefetch_related("modules").all().order_by("-id")
        subjects = Subject.objects.filter(is_demo=False).order_by("-id")
        demo_subjects = Subject.objects.filter(is_demo=True).order_by("-id")
        modules = Module.objects.filter(is_demo=False).prefetch_related("groups", "subject_configs").order_by("-id")
        demo_modules = Module.objects.filter(is_demo=True).prefetch_related("groups", "subject_configs").order_by("-id")
        questions = Question.objects.filter(subject__is_demo=False).order_by("-id")
        demo_questions = Question.objects.filter(subject__is_demo=True).order_by("-id")
        results = TestResult.objects.filter(module__is_demo=False).order_by("-date")
        demo_results = TestResult.objects.filter(module__is_demo=True).order_by("-date")
    else:
        group_id = user.group_id
        users = User.objects.filter(id=user.id)
        groups = Group.objects.prefetch_related("modules").filter(id=group_id) if group_id else Group.objects.none()
        modules = Module.objects.filter(is_demo=False, is_active=True, groups__id=group_id).prefetch_related("groups", "subject_configs").distinct()
        demo_modules = Module.objects.filter(is_demo=True, is_active=True, groups__id=group_id).prefetch_related("groups", "subject_configs").distinct()
        subject_ids = set()
        for m in list(modules) + list(demo_modules):
            subject_ids.update(m.subject_configs.values_list("subject_id", flat=True))
        subjects = Subject.objects.filter(id__in=subject_ids, is_demo=False).order_by("-id")
        demo_subjects = Subject.objects.filter(id__in=subject_ids, is_demo=True).order_by("-id")
        questions = Question.objects.filter(subject__in=subjects).order_by("-id")
        demo_questions = Question.objects.filter(subject__in=demo_subjects).order_by("-id")
        results = TestResult.objects.filter(participant=user, module__is_demo=False).order_by("-date")
        demo_results = TestResult.objects.filter(participant=user, module__is_demo=True).order_by("-date")

    return {
        "users": users,
        "groups": groups,
        "subjects": subjects,
        "modules": modules,
        "questions": questions,
        "results": results,
        "demoSubjects": demo_subjects,
        "demoModules": demo_modules,
        "demoQuestions": demo_questions,
        "demoResults": demo_results,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsParticipantOnly])
def available_tests_view(request):
    user = request.user
    group_id = user.group_id
    if not group_id:
        return Response({"main": [], "demo": []})

    main_modules = Module.objects.filter(is_demo=False, is_active=True, groups__id=group_id).distinct()
    demo_modules = Module.objects.filter(is_demo=True, is_active=True, groups__id=group_id).distinct()
    taken_main = set(TestResult.objects.filter(participant=user, module__is_demo=False).values_list("module_id", flat=True))

    return Response(
        {
            "main": [
                {
                    "id": m.id,
                    "name": m.name,
                    "alreadyTaken": m.id in taken_main,
                    "settings": {
                        "pointsPerAnswer": m.points_per_answer,
                        "durationMinutes": m.duration_minutes,
                        "passingScore": m.passing_score,
                        "randomize": m.randomize,
                        "isActive": m.is_active,
                    },
                }
                for m in main_modules
            ],
            "demo": [
                {
                    "id": m.id,
                    "name": m.name,
                    "settings": {
                        "pointsPerAnswer": m.points_per_answer,
                        "durationMinutes": m.duration_minutes,
                        "passingScore": m.passing_score,
                        "randomize": m.randomize,
                        "isActive": m.is_active,
                    },
                }
                for m in demo_modules
            ],
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsParticipantOnly])
def start_test_view(request):
    module_id = request.data.get("moduleId")
    if not module_id:
        return Response({"detail": "moduleId kerak"}, status=status.HTTP_400_BAD_REQUEST)

    module = Module.objects.prefetch_related("subject_configs").filter(id=module_id, is_active=True).first()
    if not module:
        return Response({"detail": "Test topilmadi"}, status=status.HTTP_404_NOT_FOUND)

    if module.is_demo and TestResult.objects.filter(participant=request.user, module=module).count() >= DEMO_MAX_ATTEMPTS:
        return Response({"detail": "Sizda limit tugadi"}, status=status.HTTP_400_BAD_REQUEST)
    if not module.is_demo and TestResult.objects.filter(participant=request.user, module=module).exists():
        return Response({"detail": "Bu test allaqachon topshirilgan"}, status=status.HTTP_400_BAD_REQUEST)
    if request.user.group_id is None or not module.groups.filter(id=request.user.group_id).exists():
        return Response({"detail": "Siz bu testga biriktirilmagansiz"}, status=status.HTTP_403_FORBIDDEN)

    questions = pick_questions_for_module(module)
    return Response(
        {
            "moduleId": module.id,
            "moduleName": module.name,
            "isDemo": module.is_demo,
            "settings": {
                "pointsPerAnswer": module.points_per_answer,
                "durationMinutes": module.duration_minutes,
                "passingScore": module.passing_score,
                "randomize": module.randomize,
                "isActive": module.is_active,
            },
            "questions": questions,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsParticipantOnly])
def submit_test_view(request):
    module_id = request.data.get("moduleId")
    answers = request.data.get("answers", {})
    time_taken = request.data.get("timeTaken")

    if not module_id or not isinstance(answers, dict) or not answers:
        return Response({"detail": "moduleId va answers kerak"}, status=status.HTTP_400_BAD_REQUEST)

    module = Module.objects.filter(id=module_id, is_active=True).first()
    if not module:
        return Response({"detail": "Test topilmadi"}, status=status.HTTP_404_NOT_FOUND)

    if module.is_demo and TestResult.objects.filter(participant=request.user, module=module).count() >= DEMO_MAX_ATTEMPTS:
        return Response({"detail": "Sizda limit tugadi"}, status=status.HTTP_400_BAD_REQUEST)
    if not module.is_demo and TestResult.objects.filter(participant=request.user, module=module).exists():
        return Response({"detail": "Bu test allaqachon topshirilgan"}, status=status.HTTP_400_BAD_REQUEST)
    if request.user.group_id is None or not module.groups.filter(id=request.user.group_id).exists():
        return Response({"detail": "Siz bu testga biriktirilmagansiz"}, status=status.HTTP_403_FORBIDDEN)

    try:
        question_ids = [int(k) for k in answers.keys()]
    except ValueError:
        return Response({"detail": "answers keylari savol ID bo'lishi kerak"}, status=status.HTTP_400_BAD_REQUEST)

    allowed_subject_ids = module.subject_configs.values_list("subject_id", flat=True)
    questions = Question.objects.filter(id__in=question_ids, subject_id__in=allowed_subject_ids)
    if questions.count() != len(question_ids):
        return Response({"detail": "Ba'zi savollar topilmadi"}, status=status.HTTP_400_BAD_REQUEST)

    correct = 0
    for q in questions:
        chosen = answers.get(str(q.id), answers.get(q.id))
        if chosen is not None and int(chosen) == q.correct_index:
            correct += 1

    total = len(question_ids)
    score = correct * module.points_per_answer
    is_passed = score >= module.passing_score

    result = TestResult.objects.create(
        participant=request.user,
        module=module,
        group=request.user.group,
        correct_answers=correct,
        total_questions=total,
        score=score,
        is_passed=is_passed,
        time_taken=int(time_taken) if time_taken is not None else None,
    )

    return Response(TestResultSerializer(result).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def snapshot_view(request):
    payload = _build_snapshot_payload(request.user)
    return Response(SnapshotSerializer(payload).data)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminOnly])
def sync_snapshot_view(request):
    data = request.data or {}
    users_payload = data.get("users", [])
    groups_payload = data.get("groups", [])
    subjects_payload = data.get("subjects", [])
    demo_subjects_payload = data.get("demoSubjects", [])
    modules_payload = data.get("modules", [])
    demo_modules_payload = data.get("demoModules", [])
    questions_payload = data.get("questions", [])
    demo_questions_payload = data.get("demoQuestions", [])
    results_payload = data.get("results", [])
    demo_results_payload = data.get("demoResults", [])

    with transaction.atomic():
        group_seen = set()
        group_map = {}
        group_module_links = {}
        for row in groups_payload:
            gid = _to_int(row.get("id"))
            defaults = {
                "name": row.get("name", ""),
                "is_archived": _to_bool(row.get("isArchived"), False),
            }
            if gid and Group.objects.filter(id=gid).exists():
                obj = Group.objects.get(id=gid)
                obj.name = defaults["name"]
                obj.is_archived = defaults["is_archived"]
                obj.save()
            else:
                obj = Group.objects.create(**defaults)
            group_seen.add(obj.id)
            group_map[str(row.get("id"))] = obj
            group_map[str(obj.id)] = obj
            group_module_links[obj.id] = row.get("moduleIds", [])
        Group.objects.exclude(id__in=group_seen).delete()

        subject_seen = set()
        subject_map = {}
        for row in subjects_payload + demo_subjects_payload:
            sid = _to_int(row.get("id"))
            is_demo = row in demo_subjects_payload or _to_bool(row.get("isDemo"), False)
            defaults = {"name": row.get("name", ""), "is_demo": is_demo}
            if sid and Subject.objects.filter(id=sid).exists():
                obj = Subject.objects.get(id=sid)
                obj.name = defaults["name"]
                obj.is_demo = defaults["is_demo"]
                obj.save()
            else:
                obj = Subject.objects.create(**defaults)
            subject_seen.add(obj.id)
            subject_map[str(row.get("id"))] = obj
            subject_map[str(obj.id)] = obj
        Subject.objects.exclude(id__in=subject_seen).delete()

        module_seen = set()
        module_map = {}
        module_groups = {}
        module_subject_cfgs = {}
        for row in modules_payload + demo_modules_payload:
            mid = _to_int(row.get("id"))
            is_demo = row in demo_modules_payload or _to_bool(row.get("isDemo"), False)
            settings = row.get("settings") or {}
            if not isinstance(settings, dict):
                settings = {}
            defaults = {
                "name": row.get("name", ""),
                "is_demo": is_demo,
                "points_per_answer": _to_int(settings.get("pointsPerAnswer"), 5),
                "duration_minutes": _to_int(settings.get("durationMinutes"), 30),
                "passing_score": _to_int(settings.get("passingScore"), 60),
                "randomize": _to_bool(settings.get("randomize"), True),
                "is_active": _to_bool(settings.get("isActive"), True),
            }
            if mid and Module.objects.filter(id=mid).exists():
                obj = Module.objects.get(id=mid)
                for k, v in defaults.items():
                    setattr(obj, k, v)
                obj.save()
            else:
                obj = Module.objects.create(**defaults)
            module_seen.add(obj.id)
            module_map[str(row.get("id"))] = obj
            module_map[str(obj.id)] = obj
            module_groups[obj.id] = row.get("groupIds") or []
            module_subject_cfgs[obj.id] = row.get("subjectConfigs") or []
        Module.objects.exclude(id__in=module_seen).delete()

        for module_id, group_ids in module_groups.items():
            module = Module.objects.get(id=module_id)
            mapped_groups = []
            for gid in group_ids or []:
                g = group_map.get(str(gid))
                if g:
                    mapped_groups.append(g)
            module.groups.set(mapped_groups)

        for module_id, cfgs in module_subject_cfgs.items():
            module = Module.objects.get(id=module_id)
            module.subject_configs.all().delete()
            seen_subject_ids = set()
            for cfg in cfgs or []:
                subject = subject_map.get(str(cfg.get("subjectId")))
                if not subject:
                    continue
                if subject.id in seen_subject_ids:
                    continue
                seen_subject_ids.add(subject.id)
                ModuleSubjectConfig.objects.create(
                    module=module,
                    subject=subject,
                    question_count=max(0, _to_int(cfg.get("questionCount"), 0)),
                )

        question_seen = set()
        for row in questions_payload + demo_questions_payload:
            qid = _to_int(row.get("id"))
            subject = subject_map.get(str(row.get("subjectId")))
            if not subject:
                continue
            options = row.get("options") or []
            if len(options) != 4:
                continue
            defaults = {
                "subject": subject,
                "text": row.get("text", ""),
                "option_a": options[0],
                "option_b": options[1],
                "option_c": options[2],
                "option_d": options[3],
                "correct_index": _to_int(row.get("correctIndex"), 0),
            }
            if qid and Question.objects.filter(id=qid).exists():
                obj = Question.objects.get(id=qid)
                for k, v in defaults.items():
                    setattr(obj, k, v)
                obj.save()
            else:
                obj = Question.objects.create(**defaults)
            question_seen.add(obj.id)
        Question.objects.exclude(id__in=question_seen).delete()

        user_seen = set()
        user_map = {}
        for row in users_payload:
            uid = _to_int(row.get("id"))
            group = group_map.get(str(row.get("groupId")))
            username = str(row.get("username") or "").strip()
            defaults = {
                "username": username,
                "full_name": row.get("fullName", ""),
                "workplace": row.get("workplace", ""),
                "role": row.get("role", "TINGLOVCHI"),
                "group": group,
                "is_active": True,
            }
            obj = None
            if uid and User.objects.filter(id=uid).exists():
                obj = User.objects.get(id=uid)
            elif defaults["username"] and User.objects.filter(username=defaults["username"]).exists():
                obj = User.objects.get(username=defaults["username"])

            if obj:
                for k, v in defaults.items():
                    setattr(obj, k, v)
                password = row.get("password")
                if password:
                    obj.set_password(password)
                obj.save()
            else:
                if not defaults["username"]:
                    continue
                password = row.get("password") or "123"
                obj = User.objects.create_user(password=password, **defaults)
            user_seen.add(obj.id)
            user_map[str(row.get("id"))] = obj
            user_map[str(obj.id)] = obj
        User.objects.exclude(id__in=user_seen).exclude(id=request.user.id).delete()

        result_seen = set()
        for row in results_payload + demo_results_payload:
            rid = _to_int(row.get("id"))
            participant = user_map.get(str(row.get("participantId"))) or User.objects.filter(id=_to_int(row.get("participantId"))).first()
            module = module_map.get(str(row.get("moduleId"))) or Module.objects.filter(id=_to_int(row.get("moduleId"))).first()
            group = group_map.get(str(row.get("groupId"))) or Group.objects.filter(id=_to_int(row.get("groupId"))).first()
            if not participant or not module:
                continue

            defaults = {
                "participant": participant,
                "module": module,
                "group": group,
                "correct_answers": _to_int(row.get("correctAnswers"), 0),
                "total_questions": _to_int(row.get("totalQuestions"), 0),
                "score": _to_int(row.get("score"), 0),
                "is_passed": _to_bool(row.get("isPassed"), False),
                "time_taken": _to_int(row.get("timeTaken"), None),
            }
            if rid and TestResult.objects.filter(id=rid).exists():
                obj = TestResult.objects.get(id=rid)
                for k, v in defaults.items():
                    setattr(obj, k, v)
                obj.save()
            else:
                obj = TestResult.objects.create(**defaults)
            result_seen.add(obj.id)
        TestResult.objects.exclude(id__in=result_seen).delete()

    payload = _build_snapshot_payload(request.user)
    return Response(SnapshotSerializer(payload).data)
