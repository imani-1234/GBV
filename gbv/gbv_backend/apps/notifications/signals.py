from django.contrib.auth import get_user_model
import logging

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.cases.models import Case, InformationRequest
from apps.communication.models import Message
from apps.notifications.models import Notification
from apps.reports.models import Evidence, Report

User = get_user_model()

logger = logging.getLogger(__name__)

_old_case_values = {}
_old_report_statuses = {}


def _dispatch_notification_email(notification_id, send_sync=False):
    """Deliver email without allowing broker/email outages to break API writes."""
    from apps.notifications.tasks import send_notification_email

    try:
        if send_sync:
            send_notification_email(str(notification_id))
        else:
            send_notification_email.delay(str(notification_id))
    except Exception:
        logger.exception(
            "Notification email dispatch failed for %s; notification remains stored for later retry",
            notification_id,
        )


def _create_notification(recipient_user, notification_type, payload, send_sync=False):
    notification = Notification.objects.create(
        recipient_user=recipient_user,
        notification_type=notification_type,
        payload=payload,
    )

    transaction.on_commit(
        lambda: _dispatch_notification_email(notification.id, send_sync=send_sync),
    )
    return notification


def _notify_report_submitted(report):
    payload = {
        "report_id": str(report.id),
        "case_id": getattr(getattr(report, "case", None), "id", None),
        "message": f"A new report ({report.case_number}) has been submitted.",
        "link": f"/reports/{report.id}/",
    }
    is_critical = report.priority == Report.Priority.CRITICAL
    for officer in User.objects.filter(role=User.Role.OFFICER):
        _create_notification(officer, Notification.NotificationType.NEW_REPORT_OFFICER, payload)
    for admin in User.objects.filter(role=User.Role.ADMIN):
        if is_critical:
            _create_notification(
                admin,
                Notification.NotificationType.CRITICAL_INCIDENT_ALERT,
                payload,
                send_sync=True,
            )
        else:
            _create_notification(
                admin,
                Notification.NotificationType.REPORT_SUBMITTED,
                payload,
            )


def _notify_case_assigned(case, old_officer, new_officer):
    if new_officer:
        payload = {
            "case_id": str(case.id),
            "report_id": str(case.report_id),
            "message": f"A case has been assigned to you.",
            "link": f"/cases/{case.id}/",
        }
        _create_notification(new_officer, Notification.NotificationType.CASE_ASSIGNED, payload)


def _notify_status_changed(case, old_status, new_status):
    recipients = []
    if case.report.reporter:
        recipients.append(case.report.reporter)
    if case.assigned_officer:
        recipients.append(case.assigned_officer)

    is_closed = new_status == Case.Status.CLOSED
    ntype = Notification.NotificationType.CASE_CLOSED if is_closed else Notification.NotificationType.STATUS_CHANGED
    msg = "Case has been closed." if is_closed else f"Case status changed to {new_status}."
    payload = {
        "case_id": str(case.id),
        "report_id": str(case.report_id),
        "message": msg,
        "link": f"/cases/{case.id}/",
        "from_status": old_status,
        "to_status": new_status,
    }
    for user in set(recipients):
        if user:
            _create_notification(user, ntype, payload)


# ── Report submitted ────────────────────────────────────────────────


@receiver(pre_save, sender=Report)
def track_report_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = Report.objects.get(pk=instance.pk)
            _old_report_statuses[instance.pk] = old.status
        except Report.DoesNotExist:
            pass


@receiver(post_save, sender=Report)
def handle_report_post_save(sender, instance, **kwargs):
    old_status = _old_report_statuses.pop(instance.pk, None)
    if not old_status:
        return
    if old_status != Report.Status.SUBMITTED and instance.status == Report.Status.SUBMITTED:
        _notify_report_submitted(instance)


# ── Case assigned / status changed ──────────────────────────────────


@receiver(pre_save, sender=Case)
def track_case_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = Case.objects.get(pk=instance.pk)
            _old_case_values[instance.pk] = {
                "assigned_officer": old.assigned_officer,
                "status": old.status,
            }
        except Case.DoesNotExist:
            pass


@receiver(post_save, sender=Case)
def handle_case_post_save(sender, instance, **kwargs):
    old = _old_case_values.pop(instance.pk, None)
    if not old:
        return

    if old["assigned_officer"] != instance.assigned_officer:
        _notify_case_assigned(instance, old["assigned_officer"], instance.assigned_officer)

    if old["status"] != instance.status:
        _notify_status_changed(instance, old["status"], instance.status)


# ── Message sent ────────────────────────────────────────────────────


@receiver(post_save, sender=Message)
def handle_message_post_save(sender, instance, created, **kwargs):
    if not created:
        return
    case = instance.conversation.case
    if instance.sender_actor_type in (
        Message.ActorType.OFFICER,
        Message.ActorType.ADMIN,
    ):
        recipient = case.report.reporter if case.report else None
        if not recipient:
            return
        payload = {
            "case_id": str(case.id),
            "report_id": str(case.report_id),
            "message": "An officer has replied to your case.",
            "link": f"/cases/{case.id}/",
        }
        _create_notification(recipient, Notification.NotificationType.OFFICER_REPLIED, payload)
    elif instance.sender_actor_type in (
        Message.ActorType.REPORTER,
        Message.ActorType.ANONYMOUS_REPORTER,
    ):
        if not case.assigned_officer:
            return
        payload = {
            "case_id": str(case.id),
            "report_id": str(case.report_id),
            "message": "The reporter has replied to the case.",
            "link": f"/cases/{case.id}/",
        }
        _create_notification(
            case.assigned_officer,
            Notification.NotificationType.REPORTER_REPLIED,
            payload,
        )


# ── Information requested ───────────────────────────────────────────


@receiver(post_save, sender=InformationRequest)
def handle_info_request_post_save(sender, instance, created, **kwargs):
    if not created:
        return
    case = instance.case
    recipient = case.report.reporter if case.report else None
    if not recipient:
        return
    payload = {
        "case_id": str(case.id),
        "report_id": str(case.report_id),
        "message": "Additional information has been requested for your case.",
        "link": f"/cases/{case.id}/",
        "info_request_id": str(instance.id),
    }
    _create_notification(recipient, Notification.NotificationType.INFO_REQUESTED, payload)


# ── Evidence uploaded ───────────────────────────────────────────────


@receiver(post_save, sender=Evidence)
def handle_evidence_post_save(sender, instance, created, **kwargs):
    if not created:
        return
    report = instance.report
    case = getattr(report, "case", None)
    if not case or not case.assigned_officer:
        return
    payload = {
        "case_id": str(case.id),
        "report_id": str(report.id),
        "message": "New evidence has been uploaded to a case.",
        "link": f"/cases/{case.id}/",
    }
    _create_notification(
        case.assigned_officer,
        Notification.NotificationType.EVIDENCE_UPLOADED,
        payload,
    )
