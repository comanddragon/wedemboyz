import django.core.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


def backfill_manual_ledger(apps, schema_editor):
    Payment = apps.get_model("payments", "Payment")
    Order = apps.get_model("orders", "Order")
    Invoice = apps.get_model("payments", "Invoice")

    method_map = {
        "CASH": "CASH",
        "MTN_MOMO": "MTN_MOMO",
        "ORANGE_MONEY": "ORANGE_MONEY",
    }
    for payment in Payment.objects.all().iterator():
        payment.payment_method_type = method_map.get(payment.gateway, "OTHER")
        payment.reference = payment.gateway_reference
        payment.received_at = payment.paid_at or payment.created_at
        payment.save(
            update_fields=["payment_method_type", "reference", "received_at"]
        )

    for order in Order.objects.all().iterator():
        received = sum(
            payment.amount
            for payment in Payment.objects.filter(order_id=order.pk, status="SUCCEEDED")
        )
        order.amount_paid = received
        if order.status == "CANCELLED":
            order.payment_status = "VOID"
        elif order.total_amount <= 0:
            order.payment_status = "NO_CHARGE"
        elif received <= 0:
            order.payment_status = "UNPAID"
        elif received < order.total_amount:
            order.payment_status = "PARTIALLY_PAID"
        elif received == order.total_amount:
            order.payment_status = "PAID"
        else:
            order.payment_status = "OVERPAID"
        order.save(update_fields=["amount_paid", "payment_status"])
        Invoice.objects.get_or_create(
            order_id=order.pk,
            defaults={
                "invoice_number": f"INV-{order.pk:06d}",
                "amount_due": order.total_amount,
                "amount_paid": received,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("orders", "0006_order_payment_state"),
        ("payments", "0006_alter_paymentmethod_display_label"),
    ]

    operations = [
        migrations.AddField(model_name="payment", name="change_given", field=models.DecimalField(decimal_places=0, default=0, max_digits=10, validators=[django.core.validators.MinValueValidator(0)])),
        migrations.AddField(model_name="payment", name="notes", field=models.TextField(blank=True)),
        migrations.AddField(model_name="payment", name="payer_name", field=models.CharField(blank=True, max_length=150)),
        migrations.AddField(model_name="payment", name="payer_phone", field=models.CharField(blank=True, max_length=20)),
        migrations.AddField(model_name="payment", name="payment_method_type", field=models.CharField(choices=[("CASH", "Cash"), ("MTN_MOMO", "MTN Mobile Money"), ("ORANGE_MONEY", "Orange Money"), ("BANK_TRANSFER", "Bank transfer"), ("OTHER", "Other")], db_index=True, default="OTHER", max_length=20)),
        migrations.AddField(model_name="payment", name="received_at", field=models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
        migrations.AddField(model_name="payment", name="received_by", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="payments_received", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="payment", name="reference", field=models.CharField(blank=True, db_index=True, max_length=100)),
        migrations.AddField(model_name="payment", name="tendered_amount", field=models.DecimalField(blank=True, decimal_places=0, max_digits=10, null=True, validators=[django.core.validators.MinValueValidator(0)])),
        migrations.AddField(model_name="payment", name="void_reason", field=models.TextField(blank=True)),
        migrations.AddField(model_name="payment", name="voided_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="payment", name="voided_by", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="payments_voided", to=settings.AUTH_USER_MODEL)),
        migrations.AddIndex(model_name="payment", index=models.Index(fields=["payment_method_type", "received_at"], name="payments_pa_payment_8a9315_idx")),
        migrations.RunPython(backfill_manual_ledger, migrations.RunPython.noop),
    ]
