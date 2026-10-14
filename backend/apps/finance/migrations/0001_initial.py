import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('orders', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Expense',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.CharField(choices=[('SUPPLIES', 'Supplies (detergent, softener, packaging)'), ('UTILITIES', 'Utilities (water, electricity)'), ('SALARIES', 'Salaries'), ('MAINTENANCE', 'Equipment maintenance'), ('RENT', 'Rent'), ('OTHER', 'Other')], max_length=20)),
                ('amount', models.DecimalField(decimal_places=0, max_digits=10)),
                ('currency', models.CharField(choices=[('XAF', 'Central African CFA Franc')], default='XAF', max_length=3)),
                ('date', models.DateField(help_text='Date the expense was incurred (not necessarily today).')),
                ('notes', models.TextField(blank=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='expenses_recorded', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-date', '-created_at'],
            },
        ),
        migrations.CreateModel(
            name='CreditAccount',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('balance', models.DecimalField(decimal_places=0, default=0, max_digits=10)),
                ('credit_limit', models.DecimalField(decimal_places=0, default=0, help_text='0 = no limit enforced.', max_digits=10)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='credit_account', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-balance'],
            },
        ),
        migrations.CreateModel(
            name='CreditTransaction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('transaction_type', models.CharField(choices=[('CHARGE', 'Charge (customer took goods/services on credit)'), ('PAYMENT', "Payment (customer paid down their balance)"), ('ADJUSTMENT', 'Manual adjustment')], max_length=10)),
                ('amount', models.DecimalField(decimal_places=0, help_text='For CHARGE/PAYMENT, a positive magnitude (sign is derived from transaction_type). For ADJUSTMENT, may be signed directly: positive increases the balance owed, negative reduces it.', max_digits=10)),
                ('note', models.CharField(blank=True, max_length=255)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='credit_transactions_recorded', to=settings.AUTH_USER_MODEL)),
                ('credit_account', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transactions', to='finance.creditaccount')),
                ('order', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='credit_transactions', to='orders.order')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
