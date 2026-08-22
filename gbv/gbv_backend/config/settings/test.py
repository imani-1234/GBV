from .dev import *  # noqa: F401, F403

# Completely disable default throttling in tests.
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []

# View-level throttle_classes (e.g. auth register/login viewsets) still execute
# even when the default list is empty, and DRF raises ImproperlyConfigured when a
# scope has no rate. Give every scope used by the app a generous rate so the
# throttles never trip during tests.
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
    "anon": "100000/hour",
    "user": "100000/hour",
    "login": "100000/hour",
    "register": "100000/hour",
    "anonymous_register": "100000/hour",
    "burst": "100000/minute",
    "sustained": "100000/hour",
}
