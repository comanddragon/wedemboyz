import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("users", "0001_initial")]

    operations = [
        migrations.AddField(model_name="customuser", name="is_walk_in", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="userprofile", name="notes", field=models.TextField(blank=True)),
        migrations.AddField(model_name="userprofile", name="tags", field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name="userprofile", name="source", field=models.CharField(choices=[("ONLINE", "Online"), ("WALK_IN", "Walk-in"), ("REFERRAL", "Referral"), ("OTHER", "Other")], default="ONLINE", max_length=20)),
        migrations.AddField(model_name="userprofile", name="is_blocked", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="userprofile", name="blocked_reason", field=models.TextField(blank=True)),
        migrations.AddField(model_name="userprofile", name="marketing_opt_in", field=models.BooleanField(default=False)),
        migrations.AddField(model_name="userprofile", name="whatsapp_number", field=models.CharField(blank=True, max_length=15)),
        migrations.AddField(model_name="userprofile", name="secondary_phone", field=models.CharField(blank=True, max_length=15)),
        migrations.AddField(model_name="userprofile", name="gender", field=models.CharField(blank=True, choices=[("FEMALE", "Female"), ("MALE", "Male"), ("OTHER", "Other"), ("PREFER_NOT", "Prefer not to say")], max_length=20)),
        migrations.AddField(model_name="userprofile", name="default_pickup_address", field=models.CharField(blank=True, max_length=255)),
        migrations.AddField(model_name="userprofile", name="referred_by", field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="referred_customers", to="users.customuser")),
    ]
