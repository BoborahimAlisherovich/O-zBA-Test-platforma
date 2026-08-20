from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_group"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["role"], name="accounts_us_role_3e7d07_idx"),
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["group", "role"], name="accounts_us_group_i_0d9787_idx"),
        ),
    ]
