from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import StaffActivityLog, StaffProfile


@receiver(post_save, sender=StaffProfile)
def on_staff_profile_saved(sender, instance, created, **kwargs):
    """Log every staff profile creation/role change/(de)activation."""
    action = "staff_added" if created else "staff_updated"
    description = f"role={instance.role}, active={instance.is_active}"
    StaffActivityLog.objects.create(staff=instance.user, action=action, description=description)
