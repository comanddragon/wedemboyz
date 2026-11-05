import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("discounts", "0005_ambassadorcashout")]

    operations = [
        migrations.AlterField(
            model_name="ambassadorcredit",
            name="order",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="ambassador_credit",
                to="orders.order",
            ),
        ),
    ]
