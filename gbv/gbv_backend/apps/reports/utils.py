import datetime
import os
import re

from django.conf import settings


def generate_case_number():
    year = datetime.date.today().year
    from apps.reports.models import Report

    last = (
        Report.objects.filter(case_number__startswith=f"GBV-{year}-")
        .order_by("case_number")
        .last()
    )
    if last and last.case_number:
        try:
            num = int(last.case_number.rsplit("-", 1)[-1]) + 1
        except (ValueError, IndexError):
            num = 1
    else:
        num = 1
    return f"GBV-{year}-{num:06d}"


def evidence_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower() if filename else ""
    safe_name = re.sub(r"[^\w\-.]", "_", f"{instance.id}{ext}")
    return f"evidence/{instance.report_id}/{safe_name}"
