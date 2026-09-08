# Implementation Plan: Share Event Time

**Branch**: `devsecninja-build-world-time-events` | **Date**: 2026-09-07 | **Spec**:
[spec.md](spec.md)

**Input**: Feature specification from `specs/001-share-event-time/spec.md`

## Summary

Build a static React application that creates versioned, readable event links in the URL fragment
and renders the same instant in any selected IANA time zone. Temporal provides strict date/time and
DST semantics; a generated, versioned reference-data layer makes every supported country and time
zone searchable and testable. The core app is dependency-light and offline-first, while geolocation
and a WebGL globe are lazy, optional enhancements. No user or event state is persisted.

## Technical Context

**Language/Version**: TypeScript 7.0, React 19.2, modern browser JavaScript modules

**Primary Dependencies**: Vite 8, `temporal-polyfill`, Fuse.js, build-time `moment-timezone`,
`@vvo/tzdb`, `@photostructure/tz-lookup`, `react-globe.gl`, `world-atlas`, `topojson-client`,
`i18n-iso-countries`, `vite-plugin-pwa`

**Storage**: No application data storage. Workbox Cache Storage contains immutable, versioned
application assets and generated public reference data only.

**Testing**: Vitest 4, React Testing Library, fast-check, Playwright 1.63, `@axe-core/playwright`,
axe-core

**Target Platform**: Current evergreen desktop and mobile browsers; installable PWA; static
deployment below a GitHub Pages repository path and at a host root

**Project Type**: Frontend-only single-page static web application

**Performance Goals**: Viewer summary usable within 2 seconds on a mid-range mobile device;
time-zone search results within 300 milliseconds; initial executable JavaScript under 200 KB
compressed; globe excluded from the initial bundle and precache

**Constraints**: No backend, authentication, analytics, tracking, cookies, persistent preferences,
or user-data caches. All external assets self-hosted. Coordinates may leave the browser only through
a separately consented reverse-geocoding request.

**Scale/Scope**: Two primary views, English and Dutch, 419 supported zones, 249 ISO countries plus
Kosovo, 235,694 GeoNames cities, one optional reverse-geocoder, and one lazy-loaded globe

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                          | Design Evidence                                                                                                                                  | Status |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| Privacy by Design                  | Fragment links, memory-only state, no telemetry, explicit two-stage location consent, restricted PWA caches                                      | PASS   |
| Time-Zone Correctness              | Temporal instant is authoritative; pinned IANA 2026c transition rules retain consistent behavior across browsers; DST disambiguation is explicit | PASS   |
| Accessible Progressive Enhancement | Native controls, semantic combobox, keyboard path, globe as optional enhancement, reduced-motion/forced-color handling                           | PASS   |
| Offline-First Performance          | Core data and routes precached; optional globe lazy-loaded; remote lookup never required                                                         | PASS   |
| Spec-Driven, Tested Delivery       | Complete catalog unit/E2E validation, accessibility testing, type check and production build gates                                               | PASS   |

Post-design review: PASS. No complexity exceptions are required.

## Project Structure

### Documentation (this feature)

```text
specs/001-share-event-time/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── privacy-contract.md
│   ├── reference-data-contract.md
│   └── share-link-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
public/
├── icons/
└── data/
    └── generated/

scripts/
└── generate-reference-data.mjs

src/
├── app/
│   ├── App.tsx
│   └── app-state.ts
├── components/
├── data/
│   ├── aliases.ts
│   └── generated/
├── domain/
│   ├── event.ts
│   ├── location.ts
│   ├── share-link.ts
│   ├── temporal.ts
│   └── timezone-search.ts
├── features/
│   ├── create-event/
│   ├── event-viewer/
│   ├── globe/
│   ├── location/
│   └── timezone-picker/
├── i18n/
│   ├── en.ts
│   ├── nl.ts
│   └── index.ts
├── styles/
├── main.tsx
└── vite-env.d.ts

tests/
├── e2e/
├── integration/
└── unit/
```

**Structure Decision**: Use one Vite application with pure domain modules separated from feature UI.
Large source and generated datasets are distributed as a checksummed, versioned GitHub prerelease
asset pinned by `reference-data.json`; only small provenance/source metadata is committed. Optional
location and globe code is dynamically imported.

## Complexity Tracking

No constitution violations or unjustified complexity are present.
