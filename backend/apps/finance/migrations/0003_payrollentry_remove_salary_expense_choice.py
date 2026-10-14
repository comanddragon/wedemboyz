from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("finance", "0002_expense_finance_exp_date_8ba413_idx"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="expense", name="category",
            field=models.CharField(choices=[("SUPPLIES", "Supplies (detergent, softener, packaging)"), ("UTILITIES", "Utilities (water, electricity)"), ("MAINTENANCE", "Equipment maintenance"), ("RENT", "Rent"), ("OTHER", "Other")], max_length=20),
        ),
        migrations.CreateModel(
            name="PayrollEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("pay_period", models.DateField(help_text="Use the first day of the salary month.")),
                ("amount", models.DecimalField(decimal_places=0, max_digits=10)),
                ("currency", models.CharField(choices=[("XAF", "Central African CFA Franc")], default="XAF", max_length=3)),
                ("status", models.CharField(choices=[("PENDING", "Pending"), ("PAID", "Paid")], default="PENDING", max_length=10)),
                ("paid_on", models.DateField(blank=True, null=True)),
                ("notes", models.CharField(blank=True, max_length=255)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="payroll_entries_created", to=settings.AUTH_USER_MODEL)),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="payroll_entries", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-pay_period", "employee__first_name"]},
        ),
        migrations.AddConstraint(
            model_name="payrollentry",
            constraint=models.UniqueConstraint(fields=("employee", "pay_period"), name="unique_employee_pay_period"),
        ),
        migrations.AddIndex(
            model_name="payrollentry",
            index=models.Index(fields=["status", "pay_period"], name="finance_pay_status_a00582_idx"),
        ),
    ]
