from django.db import migrations, models


def seed_tiers(apps, schema_editor):
    Config = apps.get_model("discounts", "LoyaltyTierConfig")
    for tier, threshold in (("BRONZE", 0), ("SILVER", 1000), ("GOLD", 5000)):
        Config.objects.get_or_create(tier=tier, defaults={"minimum_lifetime_points": threshold})


class Migration(migrations.Migration):
    dependencies = [("discounts", "0002_stampcardconfig")]
    operations = [
        migrations.CreateModel(
            name="LoyaltyTierConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("tier", models.CharField(choices=[("BRONZE", "Bronze"), ("SILVER", "Silver"), ("GOLD", "Gold")], max_length=10, unique=True)),
                ("minimum_lifetime_points", models.PositiveIntegerField(default=0)),
                ("discount_percent", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("bonus_points_percent", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("priority_service", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["minimum_lifetime_points"]},
        ),
        migrations.RunPython(seed_tiers, migrations.RunPython.noop),
    ]
