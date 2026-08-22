
## Android-error reproduction after fix

After restarting Expo with SDK-compatible dependencies, the `/reports/new` route rendered successfully. When the categories endpoint was unavailable, the wizard showed the new safe `Incident types are temporarily unavailable` state instead of calling `.map` on an invalid payload. No error boundary appeared.

## Final live verification

After aligning Expo dependencies and normalizing category payloads, the live `/reports/new` route rendered the safe empty-category state and continued to show the full wizard and navigation. The browser console was clean with no runtime exception.
