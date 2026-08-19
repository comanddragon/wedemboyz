import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='InventoryItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=150)),
                ('category', models.CharField(choices=[('DETERGENT', 'Detergent'), ('SOFTENER', 'Fabric softener'), ('PACKAGING', 'Packaging (bags, hangers, tags)'), ('EQUIPMENT', 'Equipment/parts'), ('OTHER', 'Other')], default='OTHER', max_length=20)),
                ('unit', models.CharField(choices=[('L', 'Liters'), ('KG', 'Kilograms'), ('PCS', 'Pieces'), ('ML', 'Milliliters')], default='PCS', max_length=5)),
                ('quantity', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('low_stock_threshold', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('notes', models.TextField(blank=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='InventoryTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('change_type', models.CharField(choices=[('RESTOCK', 'Restock (delivery received)'), ('USAGE', 'Usage (consumed in operations)'), ('ADJUSTMENT', 'Manual adjustment (stocktake correction)')], max_length=10)),
                ('quantity_change', models.DecimalField(decimal_places=2, help_text='Positive for restocks/upward adjustments, negative for usage/downward adjustments.', max_digits=10)),
                ('reason', models.CharField(blank=True, max_length=255)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='inventory_adjustments', to=settings.AUTH_USER_MODEL)),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='inventory.inventoryitem')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
