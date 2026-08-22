# Imani — GBV Incident Reporting System

A secure, role-based mobile and web application for reporting and managing gender-based violence (GBV) incidents across university campuses. Built with Expo (React Native) and a Django REST backend.

**Roles:** Reporter (identified + anonymous) | Officer | Admin

---

## Architecture Overview

```
app/                          # Expo Router file-based routing
├── _layout.tsx               # Root layout: providers, error boundary
├── index.tsx                 # Landing / role-gate
├── (auth)/                   # Pre-auth flow (login, register, anonymous)
├── (reporter)/               # Reporter role screens
├── (officer)/                # Officer role screens
└── (admin)/                  # Admin role screens

src/
├── api/                      # API clients (axios per-endpoint modules)
├── components/
│   ├── navigation/           # TabBar, SideRail, ResponsiveListDetail
│   ├── shared/               # ChatThread
│   └── ui/                   # Design-system primitives (Button, Card, Chip, etc.)
├── hooks/                    # Custom hooks (useBreakpoint)
├── stores/                   # Zustand stores (authStore, themeStore)
├── theme/                    # M3 design tokens (colors, typography, spacing)
├── types/                    # TypeScript interfaces (Case, User, Message, etc.)
├── utils/                    # Utilities (haptics)
├── validation/               # Zod schemas for form validation
└── __tests__/                # Vitest test suite
```

## RBAC Routing

Expo Router's file-based routing enforces role separation at the directory level:

| Route Group        | Role     | Guard                     |
|--------------------|----------|---------------------------|
| `(auth)/`          | None     | Public                    |
| `(reporter)/`      | REPORTER | `useAuthStore` gate       |
| `(officer)/`       | OFFICER  | `useAuthStore` gate       |
| `(admin)/`         | ADMIN    | `useAuthStore` gate       |

Each role layout reads `authStore.user.role` and redirects to the correct group on mismatch. Deep-linking into a forbidden route shows an "Unauthorized" screen, never a raw error.

## Theming

Material Design 3 (M3) dynamic color system:

- **Tonal palettes** defined in `src/theme/colors.ts` (primary violet/indigo, secondary teal, tertiary amber/coral)
- **Light + dark schemes** auto-generated from palettes
- **Role-accented nav chrome**: Reporter = primary (violet), Officer = secondary (teal), Admin = tertiary (amber)
- **Mode**: light / dark / system — persisted in AsyncStorage
- All chart colors and component tokens pull from the `scheme` object, never hardcoded

## Running Locally

```bash
# Install dependencies
npm install --legacy-peer-deps

# Set your API URL
cp .env.example .env
# Edit .env with your backend URL

# Start dev server
npx expo start

# Open on web
npx expo start --web

# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android
```

## Running Tests

```bash
# Run all tests
npx vitest run

# Watch mode
npx vitest

# Coverage report
npx vitest run --coverage
```

## EAS Production Builds

```bash
# Install EAS CLI
npm install -g eas-cli

# Development build (local dev client)
eas build --profile development --platform all

# Preview build (internal distribution)
eas build --profile preview --platform all

# Production build (App Store / Play Store)
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Environment Variables

| Variable                | Required | Default               | Description                    |
|-------------------------|----------|-----------------------|--------------------------------|
| `EXPO_PUBLIC_API_URL`   | Yes      | `http://localhost:8000` | Backend API base URL          |
| `EXPO_PUBLIC_SENTRY_DSN`| No       | —                     | Sentry project DSN for crash reporting |

## Bundle Analysis

```bash
npx expo export --platform web
npx expo analyze bundle _expo/static/js/web/index-*.js
```

## Accessibility

- **WCAG AA contrast** verified across all theme tokens (light + dark)
- **Screen reader** labels on all interactive elements (`accessibilityLabel`, `accessibilityRole`)
- **Touch targets** minimum 44×44 pt on all buttons and interactive controls
- **Keyboard navigable** on web (tab order follows visual layout)
- Run `npx react-native-accessibility-engine` for automated audit

## Crash Reporting

Sentry (via `sentry-expo`) is configured but optional. To enable:

1. Create a project at [sentry.io](https://sentry.io)
2. Set `EXPO_PUBLIC_SENTRY_DSN` in your `.env`
3. Rebuild

Without a DSN, the app runs normally with no crash reporter.

## Project Status

v1.0.0 — Frontend scaffold complete. All three role experiences built:
- Reporter: anonymous/identified registration, wizard-form report submission, case status timeline, secure messaging
- Officer: dashboard with stats, case queue with filters, case detail with status transitions, evidence viewer, internal notes, info requests
- Admin: analytics dashboard (charts), case oversight, user management, audit logs, category CRUD
