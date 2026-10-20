import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("discounts", "0003_loyalty_tier_config"), ("orders", "0007_order_operations")]
    operations = [migrations.AddField(model_name="order", name="discount_campaign", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="orders", to="discounts.discountcampaign"))]
