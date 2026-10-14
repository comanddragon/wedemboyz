from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Job",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("task_name", models.CharField(max_length=255)),
                ("args", models.JSONField(default=list)),
                ("kwargs", models.JSONField(default=dict)),
                ("run_at", models.DateTimeField(db_index=True)),
                ("attempts", models.PositiveSmallIntegerField(default=0)),
                ("max_attempts", models.PositiveSmallIntegerField(default=3)),
                ("status", models.CharField(choices=[("PENDING", "Pending"), ("RUNNING", "Running"), ("RETRY", "Retry"), ("SUCCEEDED", "Succeeded"), ("FAILED", "Failed")], db_index=True, default="PENDING", max_length=16)),
                ("locked_at", models.DateTimeField(blank=True, null=True)),
                ("last_error", models.TextField(blank=True)),
                ("idempotency_key", models.CharField(blank=True, max_length=255, null=True, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"ordering": ("run_at", "id")},
        ),
        migrations.AddIndex(
            model_name="job",
            index=models.Index(fields=["status", "run_at"], name="jobs_due_idx"),
        ),
    ]
