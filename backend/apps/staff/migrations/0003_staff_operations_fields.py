from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("staff", "0002_owner_is_superuser_only")]

    operations = [
        migrations.AlterField(
            model_name="staffprofile",
            name="role",
            field=models.CharField(
                choices=[
                    ("MANAGER", "Manager"),
                    ("ATTENDANT", "Attendant"),
                    ("CASHIER", "Cashier"),
                    ("DRIVER", "Driver"),
                ],
                default="ATTENDANT",
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="staffinvite",
            name="role",
            field=models.CharField(
                choices=[
                    ("MANAGER", "Manager"),
                    ("ATTENDANT", "Attendant"),
                    ("CASHIER", "Cashier"),
                    ("DRIVER", "Driver"),
                ],
                default="ATTENDANT",
                max_length=10,
            ),
        ),
        migrations.AddField(model_name="staffprofile", name="hire_date", field=models.DateField(blank=True, null=True)),
        migrations.AddField(
            model_name="staffprofile",
            name="employment_status",
            field=models.CharField(
                choices=[
                    ("ACTIVE", "Active"),
                    ("ON_LEAVE", "On leave"),
                    ("SUSPENDED", "Suspended"),
                    ("TERMINATED", "Terminated"),
                ],
                default="ACTIVE",
                max_length=12,
            ),
        ),
        migrations.AddField(model_name="staffprofile", name="base_salary", field=models.DecimalField(blank=True, decimal_places=0, max_digits=12, null=True)),
        migrations.AddField(model_name="staffprofile", name="address", field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name="staffprofile", name="emergency_contact_name", field=models.CharField(blank=True, max_length=150)),
        migrations.AddField(model_name="staffprofile", name="emergency_contact_phone", field=models.CharField(blank=True, max_length=20)),
        migrations.AddField(model_name="staffprofile", name="notes", field=models.TextField(blank=True)),
        migrations.AddField(
            model_name="staffprofile",
            name="is_available_for_chat",
            field=models.BooleanField(default=True, help_text="Available to receive new customer chat assignments."),
        ),
    ]
