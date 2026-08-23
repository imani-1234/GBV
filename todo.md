# Sauti Yako Django Account Upgrade

- [x] Audit the custom user model, authentication endpoints, permission model, and email settings.
- [x] Add administrator-only user lifecycle APIs for listing, creating, editing, activating/deactivating, role assignment, and secure password administration.
- [x] Add Django-compatible password reset request, confirmation, and authenticated password change APIs with non-enumerating responses.
- [x] Add database migration and thorough API regression tests for user management and password flows.
- [x] Run targeted and full backend validation, then commit and push the account upgrade.

## Django Administration Password Interface

- [x] Replace the editable password-hash field in Django admin with the standard secure password-change action and form.
- [x] Add regression coverage for the administrator password-change route and push the UI refinement.
