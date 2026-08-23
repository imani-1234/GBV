# Sauti Yako Django Account Upgrade

- [x] Audit the custom user model, authentication endpoints, permission model, and email settings.
- [x] Add administrator-only user lifecycle APIs for listing, creating, editing, activating/deactivating, role assignment, and secure password administration.
- [x] Add Django-compatible password reset request, confirmation, and authenticated password change APIs with non-enumerating responses.
- [x] Add database migration and thorough API regression tests for user management and password flows.
- [x] Run targeted and full backend validation, then commit and push the account upgrade.

## Django Administration Password Interface

- [x] Replace the editable password-hash field in Django admin with the standard secure password-change action and form.
- [x] Add regression coverage for the administrator password-change route and push the UI refinement.

## Mobile Authentication Reference Match

- [x] Rebuild the React Native login screen to match the supplied reference’s lilac arc, outlined pill fields, action button, and social row.
- [x] Rebuild the React Native registration screen to match the supplied reference while preserving account creation behavior.
- [x] Validate the mobile authentication UI and interactions, then commit and push the update.

## Mobile Welcome Reference Alignment

- [x] Redesign the React Native welcome screen to share the lilac arc, spacious hierarchy, and purple pill controls used by login and registration.
- [x] Validate welcome navigation to the existing sign-in and account-creation flows, then commit and push the update.

## Mobile Help and Reporting-Mode Reference Alignment

- [x] Redesign the Immediate Help screen with the lilac arc, white canvas, and purple control language used across mobile authentication.
- [x] Redesign the report-mode choice screen with reference-aligned layout while preserving identified and anonymous reporting routes.
- [x] Validate support and reporting navigation, then commit and push the update.

## Anonymous Reporting Reliability and UI

- [x] Diagnose and fix anonymous reporter code generation so registration no longer returns a 400 error.
- [x] Add backend regression coverage for unique anonymous codes and complete anonymous registration/login behavior.
- [x] Rebuild anonymous account access and the anonymous reporting cycle with the reference-matched mobile UI.
- [x] Validate the end-to-end anonymous reporting flow, then commit and push the update.
