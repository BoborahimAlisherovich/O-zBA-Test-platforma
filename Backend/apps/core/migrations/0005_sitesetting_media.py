import base64
import uuid
from pathlib import Path

from django.core.files.base import ContentFile
from django.db import migrations, models


def _migrate_logo_field(settings_obj, legacy_field, file_field):
    raw_value = getattr(settings_obj, legacy_field, "") or ""
    if not raw_value.startswith("data:image/"):
        return
    try:
        header, encoded = raw_value.split(",", 1)
    except ValueError:
        return
    try:
        binary = base64.b64decode(encoded)
    except Exception:
        return

    extension = "png"
    if ";base64" in header:
        mime_type = header.split(";")[0].split("/")[-1]
        extension = mime_type or extension
    filename = f"branding/{legacy_field}_{uuid.uuid4().hex}.{extension}"
    django_file = ContentFile(binary, name=Path(filename).name)
    getattr(settings_obj, file_field).save(Path(filename).name, django_file, save=False)
    setattr(settings_obj, legacy_field, "")


def forwards(apps, schema_editor):
    SiteSetting = apps.get_model("core", "SiteSetting")
    for site_settings in SiteSetting.objects.all():
        _migrate_logo_field(site_settings, "login_logo", "login_logo_file")
        _migrate_logo_field(site_settings, "sidebar_logo", "sidebar_logo_file")
        site_settings.save()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_testattempt_and_result_link"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="login_logo_file",
            field=models.ImageField(blank=True, null=True, upload_to="branding/"),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="sidebar_logo_file",
            field=models.ImageField(blank=True, null=True, upload_to="branding/"),
        ),
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
