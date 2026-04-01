from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_sitesetting_demo_max_attempts"),
    ]

    operations = [
        migrations.CreateModel(
            name="ResultArchiveFolder",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at", "-id"],
            },
        ),
        migrations.AddField(
            model_name="testresult",
            name="archive_folder",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="results", to="core.resultarchivefolder"),
        ),
        migrations.AddIndex(
            model_name="resultarchivefolder",
            index=models.Index(fields=["name"], name="core_result_name_2df4d0_idx"),
        ),
        migrations.AddIndex(
            model_name="testresult",
            index=models.Index(fields=["archive_folder", "date"], name="core_testr_archive_551b26_idx"),
        ),
    ]
