from django.db import migrations, models


def populate_remaining_seconds(apps, schema_editor):
    TestAttempt = apps.get_model("core", "TestAttempt")
    for attempt in TestAttempt.objects.all():
        if attempt.expires_at and attempt.started_at:
            remaining = int(max(0, (attempt.expires_at - attempt.started_at).total_seconds()))
        else:
            remaining = 0
        attempt.remaining_seconds = remaining
        attempt.save(update_fields=["remaining_seconds"])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_performance_indexes"),
    ]

    operations = [
        migrations.AddField(
            model_name="testattempt",
            name="remaining_seconds",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(populate_remaining_seconds, migrations.RunPython.noop),
    ]
