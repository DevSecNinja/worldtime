# Tasks: Share Event Time

**Input**: Design documents from `specs/001-share-event-time/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Exhaustive country/time-zone unit and browser validation is required by the feature
specification.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the React/TypeScript/PWA project and repeatable data toolchain.

- [x] T001 Create Vite React TypeScript project metadata and scripts in package.json, tsconfig
      files, and vite.config.ts
- [x] T002 [P] Add repository ignores and shared formatting configuration in .gitignore and
      dprint.json
- [x] T003 [P] Add test runner and browser configuration in vitest.config.ts and
      playwright.config.ts
- [x] T004 [P] Add application HTML shell and PWA metadata in index.html and
      public/manifest.webmanifest

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish trustworthy data, domain contracts, localization, and the visual system
required by every user story.

- [x] T005 Implement reproducible country/time-zone generation with provenance in
      scripts/generate-reference-data.mjs
- [x] T006 Generate and commit country, city, time-zone, geometry, and provenance artifacts under
      src/data/generated/ and public/data/generated/
- [x] T007 [P] Add reviewed fuzzy aliases including `ams` in src/data/aliases.ts
- [x] T008 [P] Implement typed English and Dutch resources in src/i18n/en.ts, src/i18n/nl.ts, and
      src/i18n/index.ts
- [x] T009 [P] Implement event, display, and validation types in src/domain/event.ts
- [x] T010 [P] Implement the deep-space design system, responsive layout, themes, reduced motion,
      and forced colors in src/styles/
- [x] T011 Implement memory-only application state and root composition in src/app/app-state.tsx and
      src/app/App.tsx
- [x] T012 Add complete-catalog generator, schema, provenance, and mapping tests in
      tests/unit/reference-data.test.ts

**Checkpoint**: The data and UI foundation is independently validated and blocks all story
implementation.

---

## Phase 3: User Story 1 - Create and Share an Event (Priority: P1) MVP

**Goal**: Create a correct event from native date/time input, explicit IANA zone, and DST
resolution, then copy a readable privacy-preserving link.

**Independent Test**: Create and reopen a valid Amsterdam event, including skipped and repeated
transition cases.

- [x] T013 [P] [US1] Add DST classification and event construction tests across all supported zones
      in tests/unit/temporal.test.ts
- [x] T014 [P] [US1] Add share-link canonicalization, malformed input, Unicode, and property tests
      in tests/unit/share-link.test.ts
- [x] T015 [P] [US1] Add full-catalog search reachability and `ams` ranking tests in
      tests/unit/timezone-search.test.ts
- [x] T016 [US1] Implement strict Temporal conversion and DST resolution in src/domain/temporal.ts
- [x] T017 [US1] Implement versioned fragment serialization and parsing in src/domain/share-link.ts
- [x] T018 [US1] Implement deterministic fuzzy time-zone and city search in
      src/domain/timezone-search.ts and src/domain/city-search.ts
- [x] T019 [US1] Build the accessible time-zone combobox in
      src/features/timezone-picker/TimeZonePicker.tsx
- [x] T020 [US1] Build event creation, native/text date entry, DST resolution, and clipboard
      fallback in src/features/create-event/CreateEvent.tsx
- [x] T021 [US1] Add creator integration and accessibility tests in
      tests/integration/create-event.test.tsx

**Checkpoint**: A creator can produce a validated share link without a backend.

---

## Phase 4: User Story 2 - View the Event in My Time Zone (Priority: P1)

**Goal**: Parse a shared event and prominently render the same instant in the device and source time
zones.

**Independent Test**: Open one link under multiple emulated browser zones and verify the instant,
date boundaries, source context, and error recovery.

- [x] T022 [P] [US2] Add recipient rendering and invalid-link tests in
      tests/integration/event-viewer.test.tsx
- [x] T023 [US2] Build localized exact and relative event summaries in
      src/features/event-viewer/EventViewer.tsx
- [x] T024 [US2] Route between creator and viewer states from the fragment in src/app/App.tsx
- [x] T025 [US2] Add multi-browser recipient conversion E2E coverage in
      tests/e2e/share-event.spec.ts

**Checkpoint**: Shared links deliver the core cross-time-zone value.

---

## Phase 5: User Story 3 - Explore Another Location (Priority: P2)

**Goal**: Compare the event in any supported location by accessible search or optional interactive
globe.

**Independent Test**: Choose single- and multi-zone countries through both paths and verify explicit
zone selection.

- [x] T026 [P] [US3] Add complete country/city/zone reachability and globe mapping tests in
      tests/unit/reference-data.test.ts and tests/unit/city-search.test.ts
- [x] T027 [US3] Implement country and comparison-zone selection in
      src/features/event-viewer/LocationExplorer.tsx
- [x] T028 [US3] Implement a lazy, self-hosted, reduced-motion-aware globe in
      src/features/globe/GlobeExplorer.tsx
- [x] T029 [US3] Add search/globe equivalence E2E coverage in tests/e2e/location-explorer.spec.ts

**Checkpoint**: Globe and accessible search provide equivalent conversion capability.

---

## Phase 6: User Story 4 - Use Location Services Transparently (Priority: P2)

**Goal**: Derive likely zones locally after explicit permission and optionally retrieve a country
name only after a second informed consent.

**Independent Test**: Validate granted, denied, inaccurate, offline, declined, and provider-failure
flows while inspecting all network and storage effects.

- [x] T030 [P] [US4] Add geolocation candidate and reverse-geocoder adapter tests in
      tests/unit/location.test.ts
- [x] T031 [US4] Implement local coordinate candidate derivation and accuracy sampling in
      src/domain/location.ts
- [x] T032 [US4] Implement the two-stage disclosure, permission, consent, and fallback UI in
      src/features/location/LocationAssistant.tsx
- [x] T033 [US4] Add network, permission, and non-persistence E2E coverage in
      tests/e2e/privacy.spec.ts

**Checkpoint**: Location assistance is useful, honest, optional, and privacy-preserving.

---

## Phase 7: User Story 5 - Personalize and Use Offline (Priority: P3)

**Goal**: Provide ephemeral English/Dutch and theme controls plus a reliable installable offline
application.

**Independent Test**: Switch language/theme, refresh to confirm reset, revisit offline, and inspect
caches for public assets only.

- [x] T034 [P] [US5] Add locale completeness, date formatting, and theme tests in
      tests/unit/i18n-theme.test.tsx
- [x] T035 [US5] Build ephemeral language and theme controls in src/components/AppHeader.tsx
- [x] T036 [US5] Configure the PWA manifest, service worker, update prompt, and restricted caches in
      vite.config.ts and src/main.tsx
- [x] T037 [US5] Add offline revisit, installation metadata, and cache-content E2E tests in
      tests/e2e/offline.spec.ts

**Checkpoint**: Core workflows remain available offline with no persisted user state.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, deployment, security, performance, and complete validation.

- [x] T038 [P] Document architecture, privacy, data provenance, offline behavior, and future
      Cloudflare migration in README.md, docs/ARCHITECTURE.md, and docs/DATA-SOURCES.md
- [x] T039 [P] Add continuous integration, GitHub Pages deployment, and reference-data verification
      workflows in .github/workflows/
- [x] T040 Add metadata, icons, responsive polish, error boundaries, update messaging, and no-script
      fallback across public/ and src/
- [x] T041 Run type checking, complete unit/integration/E2E/accessibility suites, production build,
      and bundle-size validation
- [x] T042 Audit runtime requests and browser storage against
      specs/001-share-event-time/contracts/privacy-contract.md
- [x] T043 Execute the quickstart scenarios and reconcile implementation against all FR/SC items in
      specs/001-share-event-time/
- [x] T044 Add localized native-share message generation and Web Share API integration in
      src/domain/share-link.ts and src/features/create-event/CreateEvent.tsx
- [x] T045 Add unit, integration, and browser coverage for native sharing in
      tests/unit/share-link.test.ts, tests/integration/create-event.test.tsx, and
      tests/e2e/share-event.spec.ts
- [x] T046 Add an ephemeral 24-hour/AM-PM selector in src/components/AppHeader.tsx and
      src/app/app-state.tsx
- [x] T047 Apply the selected time format to event cards and native-share text with automated
      coverage
- [x] T048 Expand the primary event-viewer location field to country and city search in
      src/features/event-viewer/LocationExplorer.tsx
- [x] T049 Display a globe preview by default while preserving on-demand interaction, close control,
      and fallback behavior
- [x] T050 Consolidate country, city, and IANA zone lookup into
      src/features/timezone-picker/TimeZonePicker.tsx
- [x] T051 Move location services behind the highlighted first picker option and simplify consent
      details in src/features/location/LocationAssistant.tsx
- [x] T052 Add browser-language ordering, robust 24-hour/AM-PM time entry, dark select styling, and
      identical-time-card merging across src/
- [x] T053 Replace first-letter city files with two-character shards and a prefix routing index in
      scripts/generate-reference-data.mjs and src/domain/city-search.ts
- [x] T054 Add the conditional GeoNames updater and monthly maintenance workflow in scripts/ and
      .github/workflows/reference-data.yml
- [x] T055 Adopt the central Pages, Cloudflare preview, and Release Please reusable workflows under
      .github/workflows/
- [x] T056 Expand injection, locale, location mismatch, shard efficiency, and merged-card coverage
      under tests/
- [x] T057 Move large source and generated datasets to a checksummed GitHub data release with local
      bootstrap and packaging scripts
- [x] T058 Add reference-data SHA-based cache busting and document the application, Workbox, and
      data-release update layers
- [x] T059 Address all open pull-request review threads and remove obsolete large tracked files

---

## Dependencies & Execution Order

- Phase 1 has no dependencies.
- Phase 2 depends on Phase 1 and blocks all user stories.
- User Stories 1 and 2 form the minimum viable product and are completed in that order.
- User Stories 3 and 4 depend on foundational location catalogs but can be developed in parallel
  after User Story 2.
- User Story 5 can begin after the root shell exists and completes before final polish.
- Phase 8 depends on all selected user stories.

## Parallel Opportunities

- T002-T004 can proceed independently.
- T007-T010 can proceed after project dependencies exist.
- Each `[P]` test task can be authored before its corresponding implementation.
- User Story 3 and User Story 4 touch separate feature modules and can proceed in parallel after the
  shared domain layer is stable.
- T038 and T039 can proceed in parallel after the final build shape is known.

## Implementation Strategy

1. Complete setup and generated-data integrity first.
2. Deliver User Stories 1 and 2 as the deployable MVP.
3. Add accessible location exploration before the globe enhancement.
4. Add geolocation only after the complete manual path works.
5. Add offline and personalization behavior, then run the full catalog and privacy gates.

Every task follows the required checkbox, sequential ID, optional parallel marker, story label, and
explicit file-path format.
