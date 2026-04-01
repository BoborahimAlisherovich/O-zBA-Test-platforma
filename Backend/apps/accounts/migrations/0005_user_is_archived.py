from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_user_profile_photo"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="is_archived",
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["is_archived", "role"], name="accounts_us_is_arc_4aa7fd_idx"),
        ),
    ]
