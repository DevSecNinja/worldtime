# Reference-Data Contract

## Generated artifacts

`scripts/generate-reference-data.mjs` produces deterministic JSON artifacts consumed by the
application and tests.

Large sources and generated outputs MUST be packaged into a checksummed GitHub data prerelease.
`reference-data.json` is the committed pointer used by development, CI, and deployment. The
repository stores only small source and provenance metadata.

## Required provenance

Each generated release records:

- artifact schema version;
- source project/authority and canonical URL;
- exact package or upstream release version;
- license;
- retrieval or generation date;
- record counts and SHA-256 hashes;
- a human-readable transformation description.

## Catalog invariants

- Every time-zone identifier is unique and accepted by Temporal/Intl in each supported browser, or
  is explicitly documented as a compatibility alias.
- Every country has English and Dutch display names and at least one selectable time zone, or is
  explicitly marked as requiring manual exact-zone selection.
- Every GeoNames cities500 record resolves to a cataloged country and supported IANA time zone and
  is routed to the shard selected by its normalized name.
- Every time zone is reachable by its identifier and at least one human-facing token.
- All country-to-zone references resolve to catalog entries.
- Alias normalization produces no unresolved or unintentionally duplicate aliases.
- `ams` ranks `Europe/Amsterdam` in the first five results.

## Update policy

Renovate tracks package-based sources. A scheduled/manual reference-data workflow regenerates
artifacts and runs complete-catalog tests. Any IANA, CLDR, ISO, GeoNames, or boundary-data update
that changes output is reviewed as a data change with its provenance diff.
