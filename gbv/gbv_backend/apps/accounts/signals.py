from django.contrib.auth.models import Group
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import User

ROLE_GROUP_MAP = {
    User.Role.REPORTER: "Reporter",
    User.Role.OFFICER: "GBVOfficer",
    User.Role.ADMIN: "Admin",
}


@receiver(post_save, sender=User)
def assign_user_group(sender, instance, **kwargs):
    group_name = ROLE_GROUP_MAP.get(instance.role)
    if group_name:
        group, _ = Group.objects.get_or_create(name=group_name)
        instance.groups.set([group])
