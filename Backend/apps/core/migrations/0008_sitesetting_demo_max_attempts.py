from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0007_testattempt_remaining_seconds"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="demo_max_attempts",
            field=models.PositiveIntegerField(default=5),
        ),
    ]
