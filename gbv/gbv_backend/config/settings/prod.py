import decouple

from .base import *  # noqa: F401, F403

# Guard against DEBUG being left on in production
if DEBUG:
    raise RuntimeError(
        "DEBUG must be disabled in production. "
        "Set DEBUG=False in your environment or use the dev settings module."
    )

# Guard against default secret key in production
if SECRET_KEY and SECRET_KEY.startswith("django-insecure-"):
    raise RuntimeError(
        "SECRET_KEY must be changed from the default in production. "
        "Generate a long random value and set it via environment variable."
    )

DEBUG = False

# Production security settings
SECURE_SSL_REDIRECT = decouple.config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_NAME = "__Host-sessionid"
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_NAME = "__Host-csrftoken"
CSRF_COOKIE_HTTPONLY = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "same-origin"

# Strict CORS (no wildcard in production)
CORS_ALLOWED_ORIGINS = decouple.config(
    "CORS_ALLOWED_ORIGINS",
    default="",
    cast=decouple.Csv(),
)
if not CORS_ALLOWED_ORIGINS:
    raise RuntimeError(
        "CORS_ALLOWED_ORIGINS must be set in production. "
        "Provide a comma-separated list of allowed origins."
    )
CORS_ALLOW_ALL_ORIGINS = False

# Session security
SESSION_COOKIE_AGE = 1800  # 30 minutes
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
