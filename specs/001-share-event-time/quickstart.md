# Quickstart: Share Event Time

## Prerequisites

- Node.js 24 or newer
- npm 11 or newer

## Setup

```powershell
npm ci
npm run data:generate
npm run dev
```

Open the local URL shown by Vite.

## Validation

```powershell
npm run check
npm run test
npm run test:e2e
npm run build
```

## End-to-end scenarios

1. Create an event named `Launch` at a valid time in `Europe/Amsterdam`, copy the fragment link, and
   confirm the recipient view shows the same instant in the browser time zone.
2. Search for `ams` and confirm `Europe/Amsterdam` appears in the first five results.
3. Enter Amsterdam's spring-forward skipped time and autumn repeated time; confirm that sharing
   remains blocked until an explicit adjustment or offset is chosen.
4. Deny clipboard access and copy the selectable fallback link manually.
5. Deny geolocation, then complete the workflow through search.
6. Grant geolocation and inspect network traffic; no application request containing coordinates
   occurs.
7. Open the separate country-lookup disclosure, decline, and confirm manual search still works.
   Repeat with consent and confirm only one Nominatim request occurs.
8. Search for a country with multiple zones and choose an exact time zone using only the keyboard.
9. Switch English/Dutch and system/light/dark modes, then refresh and confirm the choices reset.
10. Complete one online visit, switch the browser offline, and create/open an event link.
11. Run the catalog suites and confirm every generated country and IANA zone is covered.
12. Build and serve once under `/worldtime/` and once at `/`; confirm the same fragment works in
    both locations.

## Privacy inspection

- Application, Local, and Session Storage remain empty.
- Cache Storage contains only versioned public assets/reference data.
- No analytics or third-party asset requests occur.
- Event details appear only after `#` in the URL.

## Expected result

All commands pass, all scenarios preserve one exact event instant, all reference records are
reachable, and optional capabilities never block the manual/offline flow.
