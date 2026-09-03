from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GroupViewSet,
    ModuleViewSet,
    QuestionViewSet,
    ResultArchiveFolderViewSet,
    SiteSettingViewSet,
    SubjectViewSet,
    TestResultViewSet,
    active_attempts_view,
    available_tests_view,
    save_test_progress_view,
    import_questions_view,
    import_users_view,
    health_view,
    lazy_questions_view,
    lazy_results_view,
    site_settings_view,
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
router.register("result-archive-folders", ResultArchiveFolderViewSet, basename="result-archive-folders")
router.register("site-settings-admin", SiteSettingViewSet, basename="site-settings-admin")

urlpatterns = [
    path("", include(router.urls)),
    path("health/", health_view),
    path("site-settings/", site_settings_view),
    path("imports/users/", import_users_view),
    path("imports/questions/", import_questions_view),
    path("tests/available/", available_tests_view),
    path("tests/attempts/active/", active_attempts_view),
    path("tests/start/", start_test_view),
    path("tests/progress/", save_test_progress_view),
    path("tests/submit/", submit_test_view),
    path("lazy/questions/", lazy_questions_view),
    path("lazy/results/", lazy_results_view),
    path("snapshot/", snapshot_view),
    path("snapshot/sync/", sync_snapshot_view),
]
