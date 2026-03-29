from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_sitesetting_titles"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="TestAttempt",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("attempt_key", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("question_payload", models.JSONField(blank=True, default=list)),
                ("answers", models.JSONField(blank=True, default=dict)),
                ("current_question_index", models.PositiveIntegerField(default=0)),
                ("started_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("expires_at", models.DateTimeField()),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("group", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="test_attempts", to="core.group")),
                ("module", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="test_attempts", to="core.module")),
                ("participant", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="test_attempts", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-updated_at", "-started_at"],
            },
        ),
        migrations.AddField(
            model_name="testresult",
            name="attempt",
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="result", to="core.testattempt"),
        ),
    ]
