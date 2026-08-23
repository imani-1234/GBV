from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = "login"


class RegisterRateThrottle(AnonRateThrottle):
    scope = "register"


class AnonymousRegisterRateThrottle(AnonRateThrottle):
    scope = "anonymous_register"


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = "password_reset"


class BurstRateThrottle(UserRateThrottle):
    scope = "burst"


class SustainedRateThrottle(UserRateThrottle):
    scope = "sustained"
