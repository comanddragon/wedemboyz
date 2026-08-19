import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import apps.staff.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='StaffProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('role', models.CharField(choices=[('OWNER', 'Owner'), ('MANAGER', 'Manager'), ('ATTENDANT', 'Attendant')], default='ATTENDANT', max_length=10)),
                ('is_active', models.BooleanField(default=True, help_text='Deactivating here revokes admin-area access without deleting the account.')),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('invited_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='staff_members_invited', to=settings.AUTH_USER_MODEL)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='staff_profile', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='StaffInvite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('phone_number', models.CharField(max_length=15)),
                ('full_name', models.CharField(blank=True, max_length=150)),
                ('role', models.CharField(choices=[('OWNER', 'Owner'), ('MANAGER', 'Manager'), ('ATTENDANT', 'Attendant')], default='ATTENDANT', max_length=10)),
                ('token', models.CharField(default=apps.staff.models.generate_invite_token, max_length=64, unique=True)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('ACCEPTED', 'Accepted'), ('REVOKED', 'Revoked'), ('EXPIRED', 'Expired')], default='PENDING', max_length=10)),
                ('expires_at', models.DateTimeField(default=apps.staff.models.default_invite_expiry)),
                ('accepted_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='staff_invite_accepted', to=settings.AUTH_USER_MODEL)),
                ('invited_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='staff_invites_sent', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='StaffActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('action', models.CharField(max_length=100)),
                ('description', models.CharField(blank=True, max_length=255)),
                ('staff', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activity_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
