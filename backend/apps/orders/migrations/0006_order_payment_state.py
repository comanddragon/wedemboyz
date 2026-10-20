import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("orders", "0005_alter_orderitem_service_type"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="amount_paid",
            field=models.DecimalField(
                decimal_places=0,
                default=0,
                max_digits=10,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="paid_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_due_date",
            field=models.DateField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("UNPAID", "Unpaid"),
                    ("PARTIALLY_PAID", "Partially paid"),
                    ("PAID", "Paid"),
                    ("OVERPAID", "Overpaid"),
                    ("PARTIALLY_REFUNDED", "Partially refunded"),
                    ("REFUNDED", "Refunded"),
                    ("WAIVED", "Waived"),
                    ("NO_CHARGE", "No charge"),
                    ("VOID", "Void"),
                ],
                db_index=True,
                default="UNPAID",
                max_length=24,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_waived_reason",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_waived_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="orders_payment_waived",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="OrderPaymentHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("from_status", models.CharField(blank=True, max_length=24)),
                ("to_status", models.CharField(max_length=24)),
                ("amount", models.DecimalField(decimal_places=0, default=0, max_digits=10)),
                ("reason", models.CharField(blank=True, max_length=255)),
                ("changed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="order_payment_changes", to=settings.AUTH_USER_MODEL)),
                ("order", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payment_history", to="orders.order")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
