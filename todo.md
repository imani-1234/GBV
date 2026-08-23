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

## Anonymous-Safe Reporter Experience

- [x] Prevent anonymous users from requesting forbidden case endpoints while retaining access to their own reports and follow-up information.
- [x] Add regression coverage for anonymous dashboard data selection and protected backend boundaries.
- [x] Redesign the reporter dashboard, report list, report detail, messages, notifications, and settings in the reference-matched mobile UI system.
- [x] Validate anonymous and identified reporter workflows, then commit and push the complete reporter update.

## Reporter Status-Bar Coverage and Rendering Fix

- [x] Remove malformed literal line-break markers from refreshed reporter headings.
- [x] Make the refreshed reporter screens cover a transparent status bar without visible SafeAreaView bands.
- [x] Validate the corrected reporter route set, then commit and push the mobile shell refinement.

## Professional Officer and Administrator Console Redesign

- [x] Audit every officer and administrator web-console route, workflow, role boundary, and existing shared component.
- [x] Define and implement a cohesive Sauti Yako console design system aligned with the refreshed mobile visual language.
- [x] Redesign administrator and officer dashboards with clear safeguarding priorities, actionable KPIs, and professional operational hierarchy.
- [x] Redesign case, report, follow-up, messaging, analytics, team, governance, and settings interfaces while preserving live Django API behavior and RBAC.
- [x] Validate desktop and mobile-responsive role-based workflows, then commit and push the complete web-console redesign.

## Reporter-Aligned Officer Interface

- [x] Audit the officer dashboard, case queue, report review, and shell against the refreshed reporter mobile design system.
- [x] Apply the reporter UI’s lilac arc artwork, white canvas, editorial hierarchy, outlined controls, and purple pill actions to all officer routes.
- [x] Preserve officer-only secure casework actions, live Django bindings, responsive behavior, and existing RBAC boundaries.
- [x] Validate the reporter-aligned officer experience, then commit and push the refinement.

## Mobile Officer and Administrator Reporter-Style Redesign

- [x] Audit all React Native officer and administrator routes, tab shells, dashboards, and protected workflows.
- [x] Define and apply the reporter UI’s lilac artwork, white canvas, editorial hierarchy, outlined controls, and purple actions to officer mobile routes.
- [x] Define and apply the reporter UI’s lilac artwork, white canvas, editorial hierarchy, outlined controls, and purple actions to administrator mobile routes.
- [x] Preserve officer and administrator data access, case/report actions, navigation, and RBAC behavior while refreshing the mobile UI.
- [x] Run mobile regression tests and a production export, then commit and push the completed mobile redesign.

## Reporter-Style Administrator Navigation Refinement

- [x] Audit the existing mobile administrator side panel and reporter navigation patterns.
- [x] Replace the administrator mobile side panel with a reporter-style primary navigation and a compact governance navigation entry point.
- [x] Refine the administrator shell across phone and wide layouts while preserving every governance route.
- [x] Validate administrator routing, tests, and production export, then commit and push the navigation refinement.

## Mobile Status-Bar Content Spacing

- [x] Audit top spacing and safe-area inset handling across all mobile route groups.
- [x] Add consistent content spacing below the system status bar without reintroducing visible safe-area background bands.
- [x] Validate mobile spacing refinement with tests and production export, then commit and push.

## Overlay-Free Mobile Sheets and Pop-ups

- [x] Audit reusable and route-local mobile sheets, modals, and pop-ups for dimmed background overlays.
- [x] Remove darkened overlays while retaining safe dismissal behavior and polished reporter-style sheet presentation.
- [x] Validate sheets and pop-ups with mobile tests and production export, then commit and push the refinement.

## Professional Reporting Metadata and Suspect Details

- [x] Audit the existing report model, API contracts, admin configuration, and mobile report wizard phases.
- [x] Add administrator-managed campus and department configuration with protected reporter-facing selection APIs.
- [x] Add privacy-conscious optional reporter gender and structured optional suspect details to report data and validation.
- [x] Update the mobile report wizard to use configured location selections and a simple optional suspect-details step.
- [x] Add backend and mobile regression tests, run migrations and production checks, then commit and push the end-to-end enhancement.
