from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_sitesetting"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesetting",
            name="site_subtitle",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="sitesetting",
            name="site_title",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
