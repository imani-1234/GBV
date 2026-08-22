import datetime

import decouple
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.cases.models import Case
from apps.communication.models import Conversation, Message
from apps.reports.models import IncidentCategory, Report


class Command(BaseCommand):
    help = "Seed demo data (never run in production)"

    def handle(self, *args, **options):
        settings_module = decouple.config("DJANGO_SETTINGS_MODULE")
        if "dev" not in settings_module and "test" not in settings_module:
            self.stderr.write(
                self.style.ERROR(
                    "Refusing to seed demo data in non-dev/test environment. "
                    f"DJANGO_SETTINGS_MODULE={settings_module!r}"
                )
            )
            return

        User = get_user_model()
        today = timezone.now().date()

        # --- Users ---
        admin_user, admin_created = self._get_or_create_user(
            User, "admin@gbv-demo.org", "Demo Admin", "DemoPass123!",
            User.Role.ADMIN, is_staff=True,
        )
        officer_user, officer_created = self._get_or_create_user(
            User, "officer@gbv-demo.org", "Demo Officer", "DemoPass123!",
            User.Role.OFFICER,
        )
        reporter_user, reporter_created = self._get_or_create_user(
            User, "reporter@gbv-demo.org", "Demo Reporter", "DemoPass123!",
            User.Role.REPORTER,
        )

        if admin_created:
            self.stdout.write(self.style.SUCCESS("Created demo admin user"))
        if officer_created:
            self.stdout.write(self.style.SUCCESS("Created demo officer user"))
        if reporter_created:
            self.stdout.write(self.style.SUCCESS("Created demo reporter user"))

        # --- Categories ---
        categories_data = [
            ("Sexual Harassment", IncidentCategory.Priority.HIGH),
            ("Sexual Assault", IncidentCategory.Priority.CRITICAL),
            ("Physical Violence", IncidentCategory.Priority.CRITICAL),
            ("Emotional Abuse", IncidentCategory.Priority.MEDIUM),
            ("Psychological Abuse", IncidentCategory.Priority.MEDIUM),
            ("Bullying", IncidentCategory.Priority.LOW),
            ("Verbal Abuse", IncidentCategory.Priority.LOW),
            ("Domestic Violence", IncidentCategory.Priority.CRITICAL),
            ("Stalking", IncidentCategory.Priority.HIGH),
            ("Cyber Harassment", IncidentCategory.Priority.MEDIUM),
            ("Discrimination", IncidentCategory.Priority.MEDIUM),
            ("Forced Marriage", IncidentCategory.Priority.CRITICAL),
            ("Economic Abuse", IncidentCategory.Priority.MEDIUM),
            ("Other", IncidentCategory.Priority.MEDIUM),
        ]

        categories = {}
        if not IncidentCategory.objects.exists():
            for name, priority in categories_data:
                cat = IncidentCategory.objects.create(
                    name=name,
                    default_priority=priority,
                )
                categories[name] = cat
            self.stdout.write(
                self.style.SUCCESS(f"Created {len(categories_data)} incident categories")
            )
        else:
            self.stdout.write(self.style.SUCCESS("Incident categories already exist, reusing"))
            for name, _ in categories_data:
                categories[name] = IncidentCategory.objects.get(name=name)

        # --- Reports ---
        if Report.objects.filter(reporter=reporter_user).exists():
            self.stdout.write(self.style.SUCCESS("Demo reports already exist, skipping"))
            return

        report1 = Report.objects.create(
            reporter=reporter_user,
            category=categories["Sexual Harassment"],
            incident_date=today,
            campus="Main Campus",
            department="Engineering",
            location_text="Library Building, Room 302",
            description=(
                "Over the past month, a fellow student has repeatedly made unwanted "
                "comments and advances toward me during lab sessions."
            ),
            status=Report.Status.SUBMITTED,
            priority=Report.Priority.HIGH,
        )
        Case.objects.create(
            report=report1,
            assigned_officer=officer_user,
            status=Case.Status.UNDER_REVIEW,
            priority=Case.Priority.HIGH,
        )

        report2 = Report.objects.create(
            reporter=reporter_user,
            category=categories["Physical Violence"],
            incident_date=today - datetime.timedelta(days=30),
            campus="Main Campus",
            department="Science",
            location_text="Parking Lot B",
            description=(
                "I was physically assaulted by an unknown individual near the "
                "parking lot, sustaining bruises on my arm and shoulder."
            ),
            status=Report.Status.SUBMITTED,
            priority=Report.Priority.CRITICAL,
        )
        Case.objects.create(
            report=report2,
            assigned_officer=officer_user,
            status=Case.Status.CLOSED,
            priority=Case.Priority.CRITICAL,
            resolution_summary=(
                "Investigation concluded. The assailant was identified and referred "
                "to the disciplinary committee. The victim received counseling "
                "services and has since recovered."
            ),
            closed_at=timezone.now(),
        )

        Report.objects.create(
            reporter=reporter_user,
            category=categories["Other"],
            incident_date=today,
            campus="Main Campus",
            department="Arts",
            location_text="Student Center",
            description=(
                "I have been experiencing subtle forms of exclusion and "
                "microaggressions within my department."
            ),
            status=Report.Status.DRAFT,
            priority=Report.Priority.MEDIUM,
        )

        self.stdout.write(self.style.SUCCESS("Created 3 demo reports"))

        # --- Conversation and message for case 1 ---
        conv, conv_created = Conversation.objects.get_or_create(case=report1.case)
        if conv_created:
            Message.objects.create(
                conversation=conv,
                sender_actor_type=Message.ActorType.OFFICER,
                sender_user=officer_user,
                body=(
                    "Dear Reporter, thank you for submitting your report. It is now "
                    "under review. A dedicated officer will reach out to you "
                    "shortly. Please do not hesitate to share any additional "
                    "information."
                ),
            )
            self.stdout.write(self.style.SUCCESS("Created demo conversation and message"))

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully"))

    def _get_or_create_user(self, User, email, full_name, password, role, is_staff=False):
        try:
            user = User.objects.get(email=email)
            return user, False
        except User.DoesNotExist:
            user = User.objects.create_user(
                email=email,
                full_name=full_name,
                password=password,
                role=role,
                is_staff=is_staff,
            )
            return user, True
