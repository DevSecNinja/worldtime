# Architecture

## Runtime shape

Worldtime is a static React application with no server-side runtime:

```text
Creator form -> validated wall time -> pinned tzdb rule engine -> fragment link / native share
Fragment link -> strict parser -> stable instant -> selected-zone display
Location permission -> local candidate lookup -> explicit zone confirmation
Country consent -> one Nominatim request -> ephemeral country label
```

Pure modules under `src/domain/` own date/time, link, search, and location contracts. Feature
components own user interaction. React state exists only for the current page lifetime.

## Time-zone correctness

The browser's built-in time-zone database may lag IANA releases. For example, the WebKit version
tested during development did not yet recognize `America/Coyhaique`. Depending on `Intl` for zone
rules would therefore make identical links behave differently across browsers.

The build generates compact offset-transition tables for every IANA 2026c `zone.tab` entry plus UTC,
covering 1970 through 2100. The application:

1. parses the entered wall time strictly;
2. calculates candidate instants for every applicable zone offset;
3. classifies zero candidates as a skipped time, one as valid, and multiple as repeated;
4. requires an explicit choice for skipped or repeated times;
5. stores wall time, source zone, chosen offset, and the stable instant in the link;
6. formats local dates through UTC after applying the pinned offset itself.

This keeps conversion deterministic in Chromium, Firefox, and WebKit while retaining the IANA
identifier for future interpretation.

## Reference-data pipeline

`scripts/generate-reference-data.mjs` combines:

- vendored IANA 2026c `zone.tab` and `iso3166.tab`;
- IANA 2026c transition data from pinned build-time `moment-timezone`;
- 235,684 cities from the pinned GeoNames cities500 snapshot, sharded by normalized first character
  for responsive offline search;
- supplemental time-zone search enrichment from `@vvo/tzdb`;
- ISO numeric mapping from `i18n-iso-countries`;
- Natural Earth geometry from `world-atlas`.

It writes deterministic JSON and a provenance manifest. No build depends on a live third-party data
endpoint. Unit tests validate hashes and every country, city, and zone; browser tests validate the
complete catalog and every generated event link.

## Privacy boundaries

The share payload is a URL fragment. Browsers do not include it in HTTP requests, so GitHub Pages or
Cloudflare Pages receive only the application path.

No application code writes to cookies, localStorage, sessionStorage, or IndexedDB. The service
worker caches only public immutable assets. Location coordinates remain in memory. The optional
Nominatim request is:

- a separate, explicit action after browser-location permission;
- disclosed before execution;
- sent without credentials and with only a strict-origin referrer;
- marked `no-store`;
- never intercepted by Workbox;
- nonessential to time-zone selection.

GitHub Pages cannot set every desired response header. The HTML includes a restrictive Content
Security Policy and referrer policy. A later Cloudflare Pages deployment should also set
`Permissions-Policy: geolocation=(self)` and equivalent HTTP CSP headers.

## Progressive enhancement

Native date/time inputs and an ARIA combobox provide the baseline. The 3D globe is dynamically
imported, uses same-origin Natural Earth geometry, and is excluded from the precache. Search remains
available when WebGL, dragging, motion, bandwidth, or assistive technology make the globe
unsuitable.

## Offline behavior

Workbox precaches the shell, localization, search catalog, and pinned transition rules. The globe
bundle and geometry enter a dedicated cache only after use. Reverse geocoding is network-only and
fails back to local search.

Update installation is prompt-based so an automatic refresh cannot discard an in-progress event
draft.

## Deployment portability

Vite uses a relative base and the manifest uses relative scope/start URLs. There is no path router;
event state lives in the fragment. Consequently, one `dist/` artifact works at both `/worldtime/` on
GitHub Pages and `/` on Cloudflare Pages.
