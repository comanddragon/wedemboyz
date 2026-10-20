import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("inventory", "0003_alter_inventoryitem_category_and_more")]

    operations = [
        migrations.AlterField(
            model_name="inventoryitem",
            name="unit_cost",
            field=models.DecimalField(decimal_places=0, default=0, max_digits=10, validators=[django.core.validators.MinValueValidator(0)]),
        ),
        migrations.AlterField(
            model_name="inventoryitem",
            name="last_purchase_cost",
            field=models.DecimalField(decimal_places=0, default=0, max_digits=10, validators=[django.core.validators.MinValueValidator(0)]),
        ),
        migrations.AlterField(
            model_name="inventoryitem",
            name="average_cost",
            field=models.DecimalField(decimal_places=0, default=0, max_digits=10, validators=[django.core.validators.MinValueValidator(0)]),
        ),
        migrations.AlterField(
            model_name="inventorytransaction",
            name="unit_cost",
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=10, null=True),
        ),
        migrations.AlterField(
            model_name="inventorytransaction",
            name="total_cost",
            field=models.DecimalField(decimal_places=0, default=0, max_digits=12),
        ),
    ]
