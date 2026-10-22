from django.db import migrations


def repair_order_load_summaries(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    for order in Order.objects.prefetch_related("items").iterator(chunk_size=200):
        items = list(order.items.all())
        pieces = sum(item.quantity for item in items)
        weight = sum((item.weight_kg or 0) * item.quantity for item in items)
        Order.objects.filter(pk=order.pk).update(
            pieces_count=pieces,
            weight_kg_total=weight,
        )


class Migration(migrations.Migration):
    dependencies = [("orders", "0011_order_options_and_item_photos")]

    operations = [
        migrations.RunPython(repair_order_load_summaries, migrations.RunPython.noop),
    ]
