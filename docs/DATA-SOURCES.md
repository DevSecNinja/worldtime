# Reference Data Sources

Worldtime uses committed, generated reference data so search and conversion remain available offline
and do not disclose user queries to a search service.

## Coverage

| Dataset             | Coverage in this release                                     |
| ------------------- | ------------------------------------------------------------ |
| IANA tzdb 2026c     | All 418 geographic entries from `zone.tab`, plus UTC         |
| ISO 3166            | All 249 officially assigned alpha-2 territories              |
| Unicode CLDR 48.2   | Pinned English and Dutch territory names                     |
| GeoNames cities500  | 235,684 cities over 500 residents or administrative seats    |
| Natural Earth 4.1.0 | 236 country/territory geometries, including a Kosovo mapping |

The GeoNames definition is intentionally explicit: this is comprehensive city coverage, not a claim
to include every hamlet, neighborhood, farm, mountain, or other named feature from the much larger
gazetteer.

## Reproducibility

`data/upstream/manifest.json` pins versions, retrieval date, URLs, licenses, and SHA-256 hashes.
`scripts/generate-reference-data.mjs` reads only those vendored sources and lockfile-pinned
packages. It writes:

- `src/data/generated/timezones.json`
- `src/data/generated/countries.json`
- `src/data/generated/time-zone-rules.json`
- `src/data/generated/provenance.json`
- `public/data/generated/cities-index.json`
- `public/data/generated/cities/*.json`
- matching public country, time-zone, provenance, rule, and globe geometry assets

CI regenerates these artifacts and fails when the committed output differs.

## Search design

Country and IANA time-zone metadata is small and loaded with the application. GeoNames cities are
normalized, sorted, and divided into one-character shards. The service worker precaches all shards
for offline completeness, while the page parses only the shard needed by the user's current prefix.

Exact and prefix matching is deterministic. Fuzzy scoring applies to the smaller time-zone metadata
catalog. Reviewed aliases enforce important shortcuts such as `ams` → `Europe/Amsterdam`.

## Licensing and attribution

- IANA tzdb: public domain.
- Unicode CLDR: Unicode License v3.
- GeoNames: Creative Commons Attribution 4.0.
- Natural Earth: public domain.
- `@vvo/tzdb`: MIT.
- `@photostructure/tz-lookup`: CC0 1.0.

GeoNames and OpenStreetMap attribution is visible in the application footer. Upstream license and
source links remain in the provenance manifest.
