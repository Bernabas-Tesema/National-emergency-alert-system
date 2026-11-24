from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update the Django admin superuser for /admin/"

    def handle(self, *args, **options):
        User = get_user_model()
        username = "admin"
        password = settings.DJANGO_ADMIN_PASSWORD
        email = "admin@ethioalert.local"
        user, created = User.objects.get_or_create(
            username=username,
            defaults={"email": email, "is_staff": True, "is_superuser": True},
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} Django admin user '{username}'"))
