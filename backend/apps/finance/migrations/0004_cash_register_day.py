import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("finance", "0003_payrollentry_remove_salary_expense_choice"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CashRegisterDay",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("date", models.DateField(default=django.utils.timezone.localdate, unique=True)),
                ("opening_float", models.DecimalField(decimal_places=0, default=0, max_digits=10)),
                ("cash_expenses", models.DecimalField(decimal_places=0, default=0, max_digits=10)),
                ("counted_cash", models.DecimalField(blank=True, decimal_places=0, max_digits=10, null=True)),
                ("status", models.CharField(choices=[("OPEN", "Open"), ("CLOSED", "Closed")], default="OPEN", max_length=10)),
                ("notes", models.TextField(blank=True)),
                ("closed_at", models.DateTimeField(blank=True, null=True)),
                ("closed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="cash_register_days_closed", to=settings.AUTH_USER_MODEL)),
                ("opened_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="cash_register_days_opened", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-date"]},
        ),
    ]
