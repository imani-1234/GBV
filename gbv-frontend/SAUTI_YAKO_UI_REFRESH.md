# Sauti Yako Mobile UI Refresh

## Completed

The Expo React Native frontend has been rebranded from Imani to **Sauti Yako** with a premium institutional visual system based on deep navy, turquoise, palm green, academic gold, and responsive light/dark themes.

The prepared Sauti Yako logo package is now copied into `assets/branding/` and exposed through the reusable `src/components/branding/BrandLockup.tsx` component. The component automatically selects light or dark assets and supports vertical, horizontal, minimal, app-icon, and one-color variants.

The public landing screen, loading/auth gate, login screen, reporter dashboard, shared tab bar, wide side rail, and admin shell now use the Sauti Yako identity. Shared button styling was refined with larger touch targets, stronger typography, improved corner radius, and premium press behavior. Expo configuration now uses Sauti Yako for the app name, slug, icon, splash image, adaptive icon assets, favicon, bundle identifiers, and permission copy.

## Verification

`npx expo export --platform web` completed successfully and produced `dist/index.html`. `git diff --check` passes. The TypeScript check still reports baseline errors in unrelated legacy files that predate this UI refresh; no branding-related errors remain in the modified files.

## Run locally

From `gbv-frontend/`:

```bash
npm install --legacy-peer-deps
npx expo start
```

For a browser preview:

```bash
npx expo start --web
```
