from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("users", "0004_laundry_preferences_and_yaounde")]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="use_profile_photo",
            field=models.BooleanField(
                default=False,
                help_text="Use the uploaded photo instead of the generated illustrated avatar.",
            ),
        ),
    ]
