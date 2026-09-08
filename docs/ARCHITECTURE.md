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
- 235,694 cities from the pinned GeoNames cities500 snapshot, placed in two-character ASCII shards
  and routed through a compact native-name prefix index for responsive offline search;
- supplemental time-zone search enrichment from `@vvo/tzdb`;
- ISO numeric mapping from `i18n-iso-countries`;
- Natural Earth geometry from `world-atlas`.

It writes deterministic JSON and a provenance manifest, then packages both public and build-time
datasets into a compressed GitHub prerelease asset. `reference-data.json` pins the release tag,
asset name, SHA-256, generation date, and city count. No regular build depends on a live third-party
data endpoint. Unit tests validate hashes and every country, city, and zone; browser tests validate
the complete catalog and every generated event link.

The regular build downloads the checksummed GitHub release asset and never contacts GeoNames. A
monthly maintenance workflow first sends a conditional HEAD request with the committed ETag and
Last-Modified values. It downloads the archive only when upstream metadata changes, publishes a new
data prerelease, and opens a pull request containing only the small source manifest and release
pointer.

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

The native date input, accessible segmented time control, and ARIA combobox provide the baseline.
The time control follows the ephemeral 24-hour/AM-PM setting rather than depending on operating
system picker presentation. The 3D globe is dynamically imported, uses same-origin Natural Earth
geometry, and is excluded from the precache. Search remains available when WebGL, dragging, motion,
bandwidth, or assistive technology make the globe unsuitable.

## Offline behavior

Workbox precaches the shell, localization, country/time-zone catalog, and pinned transition rules.
City prefix/data shards enter a dedicated runtime cache only after the corresponding search, so the
first install does not download the full catalog and previously searched cities remain available
offline. The globe bundle and geometry also enter a dedicated cache only after use. Reverse
geocoding is network-only and fails back to local search.

Update installation is prompt-based so an automatic refresh cannot discard an in-progress event
draft.

## Cache busting

- Vite content-hashes executable and stylesheet filenames.
- Workbox records content revisions for the HTML shell, manifest, icons, and public reference
  metadata, deletes superseded precaches, and prompts before activating an update.
- `reference-data.json` pins the SHA-256 of the compressed data release.
- The first 12 characters of that SHA are part of the runtime city-cache name. A new data release
  therefore fetches fresh shards and the application removes obsolete city caches.
- Optional globe chunks are content-hashed and geometry is isolated in its own runtime cache.

## Deployment portability

Vite uses a relative base and the manifest uses relative scope/start URLs. There is no path router;
event state lives in the fragment. Consequently, one `dist/` artifact works at both `/worldtime/` on
GitHub Pages and `/` on Cloudflare Pages.
