import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def backfill_order_operations(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    for order in Order.objects.all().iterator():
        order.ticket_number = f"WDL-{order.pk:06d}"
        order.source = "WALK_IN" if order.pickup_address == "In-store" else "ONLINE"
        order.pieces_count = sum(item.quantity for item in order.items.all())
        order.weight_kg_total = sum(
            (item.weight_kg or 0) * item.quantity for item in order.items.all()
        )
        order.save(
            update_fields=["ticket_number", "source", "pieces_count", "weight_kg_total"]
        )


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("orders", "0006_order_payment_state"),
    ]

    operations = [
        migrations.AddField(model_name="order", name="source", field=models.CharField(db_index=True, default="ONLINE", max_length=10)),
        migrations.AddField(model_name="order", name="internal_notes", field=models.TextField(blank=True)),
        migrations.AddField(model_name="order", name="created_by", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="orders_created_for_customers", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="order", name="assigned_to", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="orders_assigned", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="order", name="driver", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="orders_to_drive", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="order", name="cancelled_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="order", name="cancelled_by", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="orders_cancelled", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="order", name="cancel_reason", field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name="order", name="ready_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="order", name="delivered_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="order", name="expected_ready_at", field=models.DateTimeField(blank=True, db_index=True, null=True)),
        migrations.AddField(model_name="order", name="ticket_number", field=models.CharField(blank=True, max_length=30, null=True, unique=True)),
        migrations.AddField(model_name="order", name="tag_number", field=models.CharField(blank=True, db_index=True, max_length=50)),
        migrations.AddField(model_name="order", name="priority", field=models.CharField(db_index=True, default="NORMAL", max_length=10)),
        migrations.AddField(model_name="order", name="is_express", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="order", name="pieces_count", field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="order", name="weight_kg_total", field=models.DecimalField(decimal_places=2, default=0, max_digits=8)),
        migrations.AddField(model_name="orderitem", name="status", field=models.CharField(default="RECEIVED", max_length=12)),
        migrations.AddField(model_name="orderitem", name="condition_notes", field=models.TextField(blank=True)),
        migrations.AddField(model_name="orderitem", name="stain_notes", field=models.TextField(blank=True)),
        migrations.AddField(model_name="orderitem", name="photo", field=models.ImageField(blank=True, null=True, upload_to="orders/intake/%Y/%m/")),
        migrations.AlterField(model_name="orderitem", name="weight_kg", field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, validators=[django.core.validators.MinValueValidator(0.1)])),
        migrations.AddField(model_name="pickupdeliveryschedule", name="driver", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="delivery_schedules", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="pickupdeliveryschedule", name="pickup_completed_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="pickupdeliveryschedule", name="delivery_completed_at", field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="pickupdeliveryschedule", name="proof_of_delivery", field=models.ImageField(blank=True, null=True, upload_to="orders/proof/%Y/%m/")),
        migrations.AddField(model_name="pickupdeliveryschedule", name="failed_reason", field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name="pickupdeliveryschedule", name="contact_phone", field=models.CharField(blank=True, max_length=20)),
        migrations.AddField(model_name="pickupdeliveryschedule", name="address_override", field=models.CharField(blank=True, max_length=255)),
        migrations.RunPython(backfill_order_operations, migrations.RunPython.noop),
    ]
