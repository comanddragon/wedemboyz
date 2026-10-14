from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('discounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='StampCardConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('points_per_stamp', models.PositiveIntegerField(default=100, help_text='Points needed to earn 1 stamp.')),
                ('stamps_required', models.PositiveIntegerField(default=10, help_text='Stamps needed to redeem 1 free wash.')),
                ('is_active', models.BooleanField(default=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
