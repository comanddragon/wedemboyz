from django.db import migrations
from django.utils import timezone


def add_shoes_price(apps, schema_editor):
    PriceItem = apps.get_model("staff", "PriceItem")
    if not PriceItem.objects.using(schema_editor.connection.alias).filter(service_type="SHOES").exists():
        PriceItem.objects.using(schema_editor.connection.alias).create(
            service_type="SHOES", label="Chaussures (paire)", unit_mode="PIECE",
            price=2000, minimum_charge=0, effective_from=timezone.localdate(), is_active=True,
        )


class Migration(migrations.Migration):
    dependencies = [("staff", "0006_update_kilo_service_rates")]
    operations = [migrations.RunPython(add_shoes_price, migrations.RunPython.noop)]
