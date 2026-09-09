# Data Model: Share Event Time

All application entities are immutable values held in memory or encoded in a share-link fragment. No
entity is written to persistent user storage.

## Event draft

| Field            | Type                   | Rules                                                                     |
| ---------------- | ---------------------- | ------------------------------------------------------------------------- |
| `name`           | string                 | Optional, trimmed, maximum 120 Unicode code points, no control characters |
| `localDate`      | ISO date string        | Required and calendar-valid                                               |
| `localTime`      | `HH:mm` string         | Required and minute precision                                             |
| `sourceTimeZone` | IANA identifier        | Required and present in supported catalog                                 |
| `resolution`     | DST resolution or null | Required only for ambiguous/nonexistent wall times                        |

State transitions:

```text
empty -> incomplete -> valid
                    -> ambiguous -> resolved
                    -> nonexistent -> adjusted
valid/resolved/adjusted -> shared
```

## Event

| Field            | Type                | Rules                                            |
| ---------------- | ------------------- | ------------------------------------------------ |
| `version`        | `1`                 | Share schema version                             |
| `name`           | string or null      | Optional validated event name                    |
| `local`          | ISO plain date-time | Creator-entered or explicitly adjusted wall time |
| `sourceTimeZone` | IANA identifier     | Confirmed source zone                            |
| `sourceOffset`   | ISO offset          | Offset explicitly selected/resolved at creation  |
| `instant`        | ISO UTC instant     | Authoritative recipient conversion value         |

Invariants:

- `local + sourceOffset` equals `instant`.
- `sourceTimeZone` is recognized by the supported runtime.
- Reapplying current zone rules may differ only when rules changed after link creation; this
  produces a warning, never a silent instant change.

## Time-zone record

| Field        | Type              | Rules                                                  |
| ------------ | ----------------- | ------------------------------------------------------ |
| `id`         | IANA identifier   | Unique and runtime-supported                           |
| `countries`  | ISO alpha-2 array | At least one for geographic zones; stable sorted order |
| `cities`     | string array      | Search metadata only                                   |
| `aliases`    | string array      | Reviewed normalized aliases                            |
| `searchText` | string            | Generated normalized search representation             |

## Country record

| Field       | Type                  | Rules                        |
| ----------- | --------------------- | ---------------------------- |
| `alpha2`    | ISO alpha-2           | Unique                       |
| `numeric`   | ISO numeric code      | Unique where assigned        |
| `names`     | English/Dutch labels  | Nonempty                     |
| `timeZones` | IANA identifier array | At least one selectable zone |

## City record

| Field         | Type                | Rules                                                     |
| ------------- | ------------------- | --------------------------------------------------------- |
| `id`          | GeoNames integer    | Unique in the pinned snapshot                             |
| `name`        | string              | UTF-8 display name                                        |
| `asciiName`   | string              | Search and deterministic shard key                        |
| `countryCode` | ISO alpha-2 or `XK` | Resolves to a country record                              |
| `timeZone`    | IANA identifier     | Resolves to a supported time-zone record                  |
| `population`  | integer             | Used only to rank same-name results                       |
| `adminArea`   | string              | Administrative-area code used to disambiguate city labels |

## Location result

| Field                | Type                  | Rules                                         |
| -------------------- | --------------------- | --------------------------------------------- |
| `latitude`           | number                | Browser-returned, -90 through 90              |
| `longitude`          | number                | Browser-returned, -180 through 180            |
| `accuracyMeters`     | number                | Positive                                      |
| `candidateTimeZones` | IANA identifier array | Locally derived, deduplicated, user-confirmed |
| `country`            | name/code or null     | Optional response retained only in memory     |

The coordinates are discarded after candidate derivation unless the current view still offers the
separately consented country lookup.

## Display context

| Field                | Type                         | Default                                   |
| -------------------- | ---------------------------- | ----------------------------------------- |
| `locale`             | `en` or `nl`                 | Derived from browser languages, else `en` |
| `theme`              | `system`, `light`, or `dark` | `system`                                  |
| `comparisonTimeZone` | IANA identifier or null      | Device zone                               |

Display context resets on refresh.

## Reference-data provenance

| Field           | Type             | Rules                                              |
| --------------- | ---------------- | -------------------------------------------------- |
| `generatedAt`   | ISO instant      | Build/generation timestamp                         |
| `sources`       | source records   | Name, version, URL, license, retrieval date        |
| `artifacts`     | artifact records | Path, SHA-256, record count, transformation        |
| `schemaVersion` | integer          | Incremented on incompatible generated-data changes |
