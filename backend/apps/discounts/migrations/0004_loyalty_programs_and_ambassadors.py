import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("discounts", "0003_loyalty_tier_config"),
        ("orders", "0011_order_options_and_item_photos"),
    ]

    operations = [
        migrations.CreateModel(
            name="LoyaltyProgramSettings",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("credit_points_enabled", models.BooleanField(default=True)),
                ("badge_tiers_enabled", models.BooleanField(default=True)),
            ],
            options={"verbose_name_plural": "loyalty programme settings"},
        ),
        migrations.CreateModel(
            name="LoyaltyReward",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True)),
                ("track", models.CharField(choices=[("CREDIT", "Credit points"), ("BADGE", "Completed badge card")], max_length=10)),
                ("points_cost", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["track", "points_cost", "name"]},
        ),
        migrations.CreateModel(
            name="BadgeAccount",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("tier", models.CharField(choices=[("BASIC", "Basic"), ("BRONZE", "Bronze"), ("SILVER", "Silver"), ("GOLD", "Gold")], default="BASIC", max_length=10)),
                ("badges", models.PositiveSmallIntegerField(default=0)),
                ("lifetime_badges", models.PositiveIntegerField(default=0)),
                ("completed_cards", models.PositiveIntegerField(default=0)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="badge_account", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="AmbassadorProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("credit_balance", models.DecimalField(decimal_places=0, default=0, max_digits=12)),
                ("lifetime_credits", models.DecimalField(decimal_places=0, default=0, max_digits=12)),
                ("is_active", models.BooleanField(default=True)),
                ("promo_code", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="ambassador_profile", to="discounts.promocode")),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="ambassador_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["user__first_name", "user__last_name", "user_id"]},
        ),
        migrations.CreateModel(
            name="LoyaltyRewardGrant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_redeemed", models.BooleanField(default=False)),
                ("redeemed_at", models.DateTimeField(blank=True, null=True)),
                ("order", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="loyalty_reward_grants", to="orders.order")),
                ("reward", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="grants", to="discounts.loyaltyreward")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="loyalty_reward_grants", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="BadgeAward",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("badge_account", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="awards", to="discounts.badgeaccount")),
                ("order", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="badge_award", to="orders.order")),
            ],
        ),
        migrations.CreateModel(
            name="AmbassadorCredit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("order_amount", models.DecimalField(decimal_places=0, max_digits=10)),
                ("credit_amount", models.DecimalField(decimal_places=0, max_digits=10)),
                ("ambassador", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="credits", to="discounts.ambassadorprofile")),
                ("order", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="ambassador_credit", to="orders.order")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
