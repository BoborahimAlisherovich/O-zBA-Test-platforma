from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_sitesetting_media"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="group",
            index=models.Index(fields=["is_archived"], name="core_group_is_archi_1b7045_idx"),
        ),
        migrations.AddIndex(
            model_name="group",
            index=models.Index(fields=["name"], name="core_group_name_221cf5_idx"),
        ),
        migrations.AddIndex(
            model_name="subject",
            index=models.Index(fields=["is_demo", "name"], name="core_subjec_is_demo_fa7fde_idx"),
        ),
        migrations.AddIndex(
            model_name="module",
            index=models.Index(fields=["is_demo", "is_active"], name="core_module_is_demo_44bca6_idx"),
        ),
        migrations.AddIndex(
            model_name="module",
            index=models.Index(fields=["name"], name="core_module_name_2b4cbf_idx"),
        ),
        migrations.AddIndex(
            model_name="modulesubjectconfig",
            index=models.Index(fields=["subject", "module"], name="core_module_subject_4d19b7_idx"),
        ),
        migrations.AddIndex(
            model_name="question",
            index=models.Index(fields=["subject", "id"], name="core_questi_subject_693b78_idx"),
        ),
        migrations.AddIndex(
            model_name="testresult",
            index=models.Index(fields=["participant", "module"], name="core_testr_partici_2aa9b4_idx"),
        ),
        migrations.AddIndex(
            model_name="testresult",
            index=models.Index(fields=["group", "date"], name="core_testr_group_i_e42761_idx"),
        ),
        migrations.AddIndex(
            model_name="testresult",
            index=models.Index(fields=["module", "date"], name="core_testr_module__677029_idx"),
        ),
        migrations.AddIndex(
            model_name="testattempt",
            index=models.Index(fields=["participant", "completed_at", "updated_at"], name="core_testat_partici_642abf_idx"),
        ),
        migrations.AddIndex(
            model_name="testattempt",
            index=models.Index(fields=["participant", "module", "completed_at"], name="core_testat_partici_66ded2_idx"),
        ),
        migrations.AddIndex(
            model_name="testattempt",
            index=models.Index(fields=["expires_at", "completed_at"], name="core_testat_expires_7e6370_idx"),
        ),
    ]
