import os
import random
import string

from django.conf import settings

MAX_FILE_SIZE = 25 * 1024 * 1024

ALLOWED_MIME_TYPES = {
    "image/jpeg": "image",
    "image/png": "image",
    "image/gif": "image",
    "image/webp": "image",
    "application/pdf": "pdf",
    "video/mp4": "video",
    "video/mpeg": "video",
    "video/quicktime": "video",
    "audio/mpeg": "audio",
    "audio/wav": "audio",
    "audio/ogg": "audio",
    "application/msword": "document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
    "text/plain": "document",
}


def generate_reporter_code(length=6):
    chars = string.ascii_uppercase + string.digits
    while True:
        code = "".join(random.choices(chars, k=length))
        yield code


def validate_file_type(file_obj):
    content_type = getattr(file_obj, "content_type", "")
    if content_type in ALLOWED_MIME_TYPES:
        return ALLOWED_MIME_TYPES[content_type]
    ext = os.path.splitext(file_obj.name)[1].lower() if file_obj.name else ""
    ext_to_mime = {
        ".jpg": "image",
        ".jpeg": "image",
        ".png": "image",
        ".gif": "image",
        ".webp": "image",
        ".pdf": "pdf",
        ".mp4": "video",
        ".mpeg": "video",
        ".mov": "video",
        ".mp3": "audio",
        ".wav": "audio",
        ".ogg": "audio",
        ".doc": "document",
        ".docx": "document",
        ".txt": "document",
    }
    return ext_to_mime.get(ext)
