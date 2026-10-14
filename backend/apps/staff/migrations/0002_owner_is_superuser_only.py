from django.db import migrations, models


def owner_profiles_to_manager(apps, schema_editor):
    apps.get_model("staff", "StaffProfile").objects.filter(role="OWNER").update(role="MANAGER")
    apps.get_model("staff", "StaffInvite").objects.filter(role="OWNER").update(role="MANAGER")


class Migration(migrations.Migration):
    dependencies = [("staff", "0001_initial")]

    operations = [
        migrations.RunPython(owner_profiles_to_manager, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="staffprofile", name="role",
            field=models.CharField(choices=[("MANAGER", "Manager"), ("ATTENDANT", "Attendant")], default="ATTENDANT", max_length=10),
        ),
        migrations.AlterField(
            model_name="staffinvite", name="role",
            field=models.CharField(choices=[("MANAGER", "Manager"), ("ATTENDANT", "Attendant")], default="ATTENDANT", max_length=10),
        ),
    ]
