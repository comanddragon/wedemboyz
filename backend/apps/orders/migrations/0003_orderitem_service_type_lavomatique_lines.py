# Generated manually to add the storefront signboard's self-service
# lavomatique lines (Lavage, Essorage, Séchage, Repassage, Plastification)
# to ServiceType. Choices aren't DB-enforced, so this is a state-only change
# — no data migration needed for existing OrderItem rows.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_orderitem_description_orderitem_label'),
    ]

    operations = [
        migrations.AlterField(
            model_name='orderitem',
            name='service_type',
            field=models.CharField(
                choices=[
                    ('WASH_FOLD', 'Wash & Fold'),
                    ('WASH_IRON', 'Wash & Iron'),
                    ('DRY_CLEAN', 'Dry Clean'),
                    ('IRON_ONLY', 'Iron Only'),
                    ('LAVAGE', 'Lavage (Wash)'),
                    ('ESSORAGE', 'Essorage (Spin)'),
                    ('SECHAGE', 'Séchage (Dry)'),
                    ('REPASSAGE', 'Repassage (Press)'),
                    ('PLASTIFICATION', 'Plastification (Garment Wrap)'),
                ],
                max_length=20,
            ),
        ),
    ]
