# Reference Data Sources

Worldtime uses committed, generated reference data so search and conversion remain available offline
and do not disclose user queries to a search service.

## Coverage

| Dataset             | Coverage in this release                                     |
| ------------------- | ------------------------------------------------------------ |
| IANA tzdb 2026c     | All 418 geographic entries from `zone.tab`, plus UTC         |
| ISO 3166            | All 249 officially assigned alpha-2 territories              |
| Unicode CLDR 48.2   | Pinned English and Dutch territory names                     |
| GeoNames cities500  | 235,694 cities over 500 residents or administrative seats    |
| Natural Earth 4.1.0 | 236 country/territory geometries, including a Kosovo mapping |

The GeoNames definition is intentionally explicit: this is comprehensive city coverage, not a claim
to include every hamlet, neighborhood, farm, mountain, or other named feature from the much larger
gazetteer.

## Reproducibility

`data/upstream/manifest.json` pins versions, retrieval date, URLs, licenses, and SHA-256 hashes.
`scripts/generate-reference-data.mjs` reads the small committed metadata, a checksummed GeoNames
source cache, and lockfile-pinned packages. It writes:

- `src/data/generated/timezones.json`
- `src/data/generated/countries.json`
- `src/data/generated/time-zone-rules.json`
- `src/data/generated/provenance.json`
- `public/data/generated/cities-index.json`
- `public/data/generated/city-prefixes/*.json`
- `public/data/generated/cities/*.json`
- matching public country, time-zone, provenance, rule, and globe geometry assets

`scripts/package-reference-data.mjs` compresses these outputs into a GitHub prerelease asset.
`reference-data.json` pins that asset. CI and deployment run `scripts/bootstrap-reference-data.mjs`,
which verifies the release checksum before extracting it. The large source and generated files are
not committed to Git.

## Search design

Country and IANA time-zone metadata is small and loaded with the application. GeoNames cities are
normalized, sorted, and divided into two-character ASCII shards. A compact prefix index routes both
native and ASCII names to the correct shard. The service worker runtime-caches only shards the user
searches, avoiding a full-catalog first-install download while keeping those searches available
offline later. A Seattle search downloads `city-prefixes/s.json` and `cities/se.json` rather than
the former multi-megabyte `s.json`.

Exact and prefix matching is deterministic. Fuzzy scoring applies to the smaller time-zone metadata
catalog. Reviewed aliases enforce important shortcuts such as `ams` → `Europe/Amsterdam`.

## Update efficiency

Normal builds fetch the pinned GitHub release asset and make no GeoNames requests. The monthly
reference-data workflow calls `npm run data:update:cities`, which uses the committed ETag and
Last-Modified values to avoid downloading an unchanged archive. Only an upstream change generates
and publishes a new data release and opens a small pointer/manifest pull request.

## Licensing and attribution

- IANA tzdb: public domain.
- Unicode CLDR: Unicode License v3.
- GeoNames: Creative Commons Attribution 4.0.
- Natural Earth: public domain.
- `@vvo/tzdb`: MIT.
- `@photostructure/tz-lookup`: CC0 1.0.

GeoNames and OpenStreetMap attribution is visible in the application footer. Upstream license and
source links remain in the provenance manifest.
