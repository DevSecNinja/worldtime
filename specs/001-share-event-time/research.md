# Research: Share Event Time

## Date and time engine

**Decision**: Use `Temporal`/`temporal-polyfill` 1.0.4 for strict ISO plain-time and instant
parsing, plus generated IANA 2026c offset-transition tables for all zone resolution and conversion.

**Rationale**: Temporal models plain time and instants explicitly, while pinned generated rules
avoid browser tzdb drift such as WebKit not yet recognizing `America/Coyhaique`. Candidate-offset
evaluation identifies repeated and skipped local times without silently choosing a default.

**Alternatives considered**:

- Browser-only Temporal zone resolution: rejected because browser tzdb versions differ.
- `@js-temporal/polyfill`: authoritative lineage but older and larger at planning time.
- Luxon: mature but wraps `Intl` with less explicit ambiguity handling.
- Moment Timezone: bundles current rules but is a legacy-oriented and much larger stack.

**Sources**:

- [Temporal.ZonedDateTime.from](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime/from)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [temporal-polyfill](https://github.com/fullcalendar/temporal-polyfill)

## Share-link privacy and stability

**Decision**: Use readable URL fragment parameters: `v`, optional `name`, `local`, `tz`, `offset`,
and authoritative `at`.

**Rationale**: Fragments remain readable and copyable but are not sent to static-host servers or in
HTTP referrers. Including the source wall time and offset preserves the creator's intent if
political rules change after link creation, while the instant guarantees recipient conversion.

**Alternatives considered**:

- Query parameters: readable, but static-host access logs receive event details.
- Opaque encoding: shorter, but less inspectable and harder to recover or version.
- Encryption: introduces passphrase exchange and is outside this product's threat model.

**Source**: [URI fragments](https://developer.mozilla.org/docs/Web/URI/Reference/Fragment)

## Authoritative reference data

**Decision**: Generate deterministic application datasets from pinned sources and distribute them as
a checksummed GitHub data-release asset:

1. IANA tzdb release identifiers and links for canonical time-zone provenance.
2. `@vvo/tzdb` 6.198.0 for browser-friendly zone, city, country, and alias metadata.
3. ISO 3166 mappings through `i18n-iso-countries` 7.14.0.
4. Unicode CLDR release 48.2 as the documented locale-data authority used by browser `Intl`
   implementations.
5. `@photostructure/tz-lookup` 11.6.1 for local coordinate-to-zone candidates, whose generated
   dataset is CC0 and traceable to open time-zone boundary sources.
6. A pinned 2026-09-08 GeoNames cities500 snapshot for 235,694 cities over 500 residents or
   administrative seats, licensed CC BY 4.0.

The generated provenance manifest records package/source versions, URLs, licenses, retrieval date,
hashes, counts, and transformation details.

**Rationale**: IANA, Unicode, ISO, and GeoNames are stable public sources. Build-time adapters make
the data small and browser-ready while retaining a reproducible chain of custody. Browser `Intl`
remains the actual rule engine, so validation compares all generated identifiers against every
supported target browser.

**Alternatives considered**:

- Hand-maintained country and time-zone lists: rejected as incomplete and unauditable.
- Shipping raw CLDR and boundary datasets: rejected because of unnecessary payload size.
- Remote search APIs: rejected because core search must work offline and disclose no user input.

**Sources**:

- [IANA tz database overview](https://data.iana.org/time-zones/tz-link.html)
- [Unicode CLDR releases](https://cldr.unicode.org/index/downloads)
- [timezone-boundary-builder](https://github.com/evansiroky/timezone-boundary-builder)
- [tzdb metadata](https://github.com/vvo/tzdb)

## Complete catalog validation

**Decision**: Treat the generated country and time-zone catalogs as exhaustive test matrices.

**Rationale**: Hundreds of bounded records are inexpensive enough to validate on every change. The
suite catches upstream renames, unmapped countries, invalid zones, duplicate aliases, inaccessible
search entries, and browser tzdb drift.

**Validation layers**:

- Generator tests assert schema, provenance, deterministic output, unique identifiers,
  alpha-2/numeric country mappings, and nonempty zone mappings.
- Unit tests instantiate every supported IANA identifier, convert representative winter and summer
  instants, and verify round-trip invariants.
- Search tests prove every zone and country is reachable by canonical identifier or exact localized
  name; every GeoNames city maps to a valid country/zone and a deterministic shard; curated aliases
  such as `ams` have ranking assertions.
- DST tests enumerate detected transitions for zones that observe changes and verify valid,
  repeated, and skipped wall-clock classification.
- Browser tests iterate the full zone catalog in Chromium, Firefox, and WebKit, with representative
  full UI flows per region and edge-offset class.

## Time-zone search

**Decision**: Use Fuse.js 7.5.0 over a compact generated index, with deterministic exact and prefix
boosts plus reviewed aliases.

**Rationale**: Weighted local fuzzy matching is fast for the finite catalog and works offline.
Contractual aliases are not delegated to probabilistic scoring: `ams` is explicitly mapped to
`Europe/Amsterdam`.

**Alternative considered**: MiniSearch is stronger for document search but adds no value for short
identifiers and city names.

## Browser geolocation

**Decision**: Call `getCurrentPosition` only after a disclosure and explicit action. Lazy-load
`@photostructure/tz-lookup`, sample the reported accuracy area, return deduplicated candidates, and
require confirmation.

**Rationale**: Coordinates stay in the page, but boundary approximations and GPS accuracy make
automatic selection unsafe. The disclosure also notes that the browser or operating system may
contact its configured location provider independently of this app.

**Alternatives considered**:

- Server lookup: violates the frontend-only/minimization goal.
- Exact browser boundary dataset: significantly larger and still requires border uncertainty
  handling.

## Optional reverse geocoder

**Decision**: Offer one separately consented, user-initiated country-name request to the
OpenStreetMap Foundation's public Nominatim service. Use `zoom=3`, `addressdetails=1`, `credentials:
omit`, `cache: no-store`, and `referrerPolicy: strict-origin` so Nominatim can identify the app
without receiving event details; read only country name/code and never cache the response. Attribute
OpenStreetMap.

**Rationale**: It satisfies the requested exception without a secret or backend and remains
nonessential. The disclosure states that coordinates and IP address go to OSMF, the service may
return broader address metadata, and the app reads only country fields.

**Risk and mitigation**: Public Nominatim has rate and availability policies. Requests are one-shot,
never automatic or autocomplete, and all functionality remains available if it declines or fails.
The provider is isolated behind a replaceable adapter for a future Cloudflare worker or contracted
service.

**Source**: [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)

## Deferred globe exploration

**Decision**: Keep the release focused on the complete accessible search experience. The
experimental globe implementation is preserved on the dedicated Globe redesign branch and tracked
separately so its performance and visual design can improve without delaying the core product.

## Localization and themes

**Decision**: Use typed, local translation dictionaries and browser `Intl` APIs rather than an i18n
framework. Keep active locale and `system | light | dark` in React memory only.

**Rationale**: Two locales and a compact message set do not justify runtime framework weight.
`Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, and `Intl.DisplayNames` use browser CLDR data and
support correct English/Dutch output.

## PWA and deployment

**Decision**: Use Vite `base: "./"` and `vite-plugin-pwa` 1.3.0 with Workbox `generateSW`,
prompt-based updates, and a relative manifest scope.

**Rationale**: One artifact works below `/worldtime/` and at `/`. Core hashed assets and generated
reference metadata are precached. Reverse-geocoding responses are never intercepted or cached.

**Source**: [Vite static deployment](https://vite.dev/guide/static-deploy.html)

## Test stack

**Decision**: Vitest 4.1.11, React Testing Library, fast-check, Playwright 1.63, and axe-core 4.13.

**Rationale**: This combination covers pure conversion contracts, generated catalog invariants,
component flows, browser timezone/locale/geolocation emulation, offline revisits, keyboard behavior,
and automated accessibility.

**Source**: [Playwright emulation](https://playwright.dev/docs/emulation)
