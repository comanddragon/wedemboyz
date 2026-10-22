from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("users", "0003_customuser_is_guest")]

    operations = [
        migrations.AlterField(
            model_name="userprofile",
            name="city",
            field=models.CharField(default="Yaoundé", max_length=100),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="water_temperature",
            field=models.CharField(choices=[("COLD", "Cold"), ("WARM", "Warm"), ("HOT", "Hot")], default="COLD", max_length=10),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="spin_speed",
            field=models.CharField(choices=[("GENTLE", "Gentle"), ("NORMAL", "Normal"), ("HIGH", "High")], default="NORMAL", max_length=10),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="detergent_preference",
            field=models.CharField(choices=[("STANDARD", "Standard"), ("HYPOALLERGENIC", "Hypoallergenic"), ("SCENT_FREE", "Scent-free")], default="STANDARD", max_length=20),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="folding_style",
            field=models.CharField(choices=[("BY_GARMENT", "By garment type"), ("BY_OUTFIT", "By outfit"), ("HANGER_READY", "Hanger-ready")], default="BY_GARMENT", max_length=20),
        ),
    ]
