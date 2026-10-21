from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("orders", "0010_alter_orderitem_weight_kg")]

    operations = [
        migrations.AddField(
            model_name="order",
            name="fulfillment_type",
            field=models.CharField(
                choices=[("PICKUP", "Pick up"), ("DROP_OFF", "Drop off")],
                default="PICKUP",
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_option",
            field=models.CharField(
                choices=[
                    ("PAY_AT_PICKUP", "Pay at pickup"),
                    ("PAY_AFTER_DELIVERY", "Pay after delivery"),
                ],
                default="PAY_AT_PICKUP",
                max_length=24,
            ),
        ),
        migrations.CreateModel(
            name="OrderItemPhoto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("image", models.ImageField(upload_to="orders/intake/%Y/%m/")),
                ("item", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="photos", to="orders.orderitem")),
            ],
            options={"ordering": ["created_at"]},
        ),
    ]
