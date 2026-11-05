from django.db import migrations


def update_kilo_rates(apps, schema_editor):
    PriceItem = apps.get_model("staff", "PriceItem")
    PriceItem.objects.filter(service_type="REPASSAGE_PLASTIF", price=1000).update(
        price=2000, label="Lavage, essorage, séchage, repassage et plastification",
    )
    PriceItem.objects.filter(
        service_type__in=["LAVAGE_ESSORAGE", "LAVAGE_SECHAGE", "REPASSAGE_PLASTIF"],
        minimum_charge=1000,
    ).update(minimum_charge=0)


class Migration(migrations.Migration):
    dependencies = [("staff", "0005_rename_staff_price_service_e2d8a1_idx_staff_price_service_5a4af3_idx")]
    operations = [migrations.RunPython(update_kilo_rates, migrations.RunPython.noop)]
