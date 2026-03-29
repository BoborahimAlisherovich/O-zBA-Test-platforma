from django.contrib import admin

from .models import Group, Module, ModuleSubjectConfig, Question, SiteSetting, Subject, TestResult


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "is_archived", "created_at")


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "is_demo")


class ModuleSubjectConfigInline(admin.TabularInline):
    model = ModuleSubjectConfig
    extra = 1


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "is_demo", "is_active", "duration_minutes", "passing_score")
    filter_horizontal = ("groups",)
    inlines = [ModuleSubjectConfigInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "subject", "correct_index")


@admin.register(TestResult)
class TestResultAdmin(admin.ModelAdmin):
    list_display = ("id", "participant", "module", "score", "is_passed", "date")


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ("id", "site_title", "site_subtitle", "demo_max_attempts")
