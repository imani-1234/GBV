from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task
def send_notification_email(notification_id):
    from apps.notifications.models import Notification

    try:
        notification = Notification.objects.select_related("recipient_user").get(pk=notification_id)
    except Notification.DoesNotExist:
        return

    recipient = notification.recipient_user
    if not recipient or not recipient.email:
        return

    payload = notification.payload
    subject = f"GBV System: {notification.get_notification_type_display()}"
    message = payload.get("message", "")
    link = payload.get("link", "")

    body = message
    if link:
        body += f"\n\nView details: {settings.BASE_URL}{link}"

    send_mail(
        subject=subject,
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[recipient.email],
    )
