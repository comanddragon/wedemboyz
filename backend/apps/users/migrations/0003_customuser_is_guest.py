from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("users", "0002_customer_operations")]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="is_guest",
            field=models.BooleanField(default=False),
        ),
    ]
