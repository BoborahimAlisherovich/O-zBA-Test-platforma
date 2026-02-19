from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GroupViewSet,
    ModuleViewSet,
    QuestionViewSet,
    SubjectViewSet,
    TestResultViewSet,
    available_tests_view,
    snapshot_view,
    start_test_view,
    submit_test_view,
    sync_snapshot_view,
)

router = DefaultRouter()
router.register("groups", GroupViewSet, basename="groups")
router.register("subjects", SubjectViewSet, basename="subjects")
router.register("modules", ModuleViewSet, basename="modules")
router.register("questions", QuestionViewSet, basename="questions")
router.register("results", TestResultViewSet, basename="results")

urlpatterns = [
    path("", include(router.urls)),
    path("tests/available/", available_tests_view),
    path("tests/start/", start_test_view),
    path("tests/submit/", submit_test_view),
    path("snapshot/", snapshot_view),
    path("snapshot/sync/", sync_snapshot_view),
]
