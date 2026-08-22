from .base import *  # noqa: F401,F403

DEBUG = True

ALLOWED_HOSTS = ["localhost","0.0.0.0","10.15.214.240","192.168.1.126","127.0.0.1", "10.0.2.2", "10.198.109.240"]

# Use SQLite for dev so tests don't req`uire PostgreSQL
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

CORS_ALLOW_ALL_ORIGINS = True

# High rate limits in dev so tests don't hit rate limits
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
    "anon": "10000/hour",
    "user": "100000/hour",
    "login": "10000/hour",
    "register": "10000/hour",
    "anonymous_register": "10000/hour",
    "burst": "10000/minute",
    "sustained": "100000/hour",
}
