from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("notifications", "0002_whatsapp_and_device_tokens")]
    operations = [
        migrations.AddField(
            model_name="notification",
            name="event_key",
            field=models.CharField(max_length=255, unique=True, null=True, blank=True),
        ),
        migrations.AddField(
            model_name="notification",
            name="action_path",
            field=models.CharField(max_length=255, blank=True),
        ),
        migrations.AlterModelOptions(
            name="notification", options={"ordering": ["-created_at", "-id"]}
        ),
    ]
