# Worldtime

A privacy-first Progressive Web App for sharing one event instant across time zones. Create an event
in an exact IANA time zone, copy a readable link, and let recipients see the same moment in their
own zone or anywhere they choose.

## Highlights

- Strict daylight-saving handling: repeated and skipped clock times require an explicit choice.
- Readable fragment links: event data stays after `#` and is not sent to the static host.
- Native OS sharing with a localized event summary, plus a full-message clipboard fallback.
- Complete catalog coverage: 419 supported zones, 249 ISO countries plus Kosovo, and 235,684
  GeoNames cities (all places over 500 residents or administrative seats).
- Fuzzy local search: typing `ams` surfaces `Europe/Amsterdam`.
- Accessible search plus a lazy-loaded 3D globe.
- Optional location assistance with local coordinate-to-zone derivation.
- Separate informed consent before an optional OpenStreetMap Nominatim country lookup.
- English and Dutch, with system/light/dark themes that reset on refresh.
- Offline creation and viewing after the first successful visit.
- No backend, account, analytics, cookies, or persisted user/event/location state.

## Development

Requires Node.js 24+ and npm 11+.

```powershell
npm ci
npm run dev
```

The pre-development hook regenerates deterministic reference data from the pinned sources under
`data/upstream/`.

## Validation

```powershell
npm run check
npm test
npm run test:e2e
npm run build
```

The automated suite validates every supported IANA zone and ISO country. Playwright runs the
primary, privacy, accessibility, and catalog flows in Chromium, Firefox, and WebKit. The offline
top-level navigation test runs in Chromium and Firefox because Playwright's Windows WebKit port
currently reports an internal error for offline navigation; WebKit still runs cache-content and all
other PWA tests.

## Privacy

Worldtime stores no event, location, language, theme, or consent data. PWA Cache Storage contains
only versioned static assets and public reference data.

Browser geolocation is optional and starts only after a user action. Coordinates are used inside the
page to suggest time zones. The browser or operating system may independently contact its configured
location provider.

Country-name lookup is a second, optional action. Before it runs, the app explains that latitude,
longitude, requested language, IP address, app origin, and normal network metadata go to the
OpenStreetMap Foundation Nominatim service. Nominatim may return broader address metadata; Worldtime
reads only country name and country code and does not cache the response. Sending the origin
satisfies Nominatim's requirement that browser applications identify themselves without exposing the
event fragment.

## Data sources

| Data                           | Pinned source                                               |
| ------------------------------ | ----------------------------------------------------------- |
| Zone identifiers and countries | IANA Time Zone Database 2026c                               |
| Offset transitions             | IANA tzdb 2026c through moment-timezone 0.6.3 at build time |
| Locale authority               | Unicode CLDR 48.2 pinned JSON                               |
| Country identifiers            | ISO 3166 through i18n-iso-countries 7.14.0                  |
| City search                    | GeoNames cities500 snapshot from 2026-09-07                 |
| Country geometry               | Natural Earth 4.1.0 through world-atlas 2.0.2               |
| Search enrichment              | @vvo/tzdb 6.198.0                                           |
| Coordinate candidates          | @photostructure/tz-lookup 11.6.1                            |

Exact URLs, licenses, hashes, counts, and transformations are recorded in
`data/upstream/manifest.json` and `src/data/generated/provenance.json`.

GeoNames defines this comprehensive city catalog as all places with more than 500 residents plus
administrative seats down to PPLA4. The application does not claim to index every hamlet or named
geographic feature in the much larger GeoNames gazetteer.

## Deployment

Pushes to `main` build and deploy `dist/` to GitHub Pages. The production build uses relative asset
paths and fragment links, so the same artifact can later move to Cloudflare Pages without changing
event-link semantics.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the
[Speckit feature artifacts](specs/001-share-event-time/) for the full design.
