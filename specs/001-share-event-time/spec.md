# Feature Specification: Share Event Time

**Feature Branch**: `devsecninja-build-world-time-events`

**Created**: 2026-09-07

**Status**: Approved

**Input**: User description: "Create a modern, frontend-only event time sharing PWA where creators
define an event and share a readable link. Recipients see the event in their time zone and can
explore locations on a globe or through search. Support optional, transparent location services,
English and Dutch, light/dark/system themes, offline use, GitHub Pages deployment, and no local
event-data storage."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create and Share an Event (Priority: P1)

A creator enters an optional event name, chooses a local event date and time, confirms their exact
IANA time zone, and copies a link that represents the event without creating an account or sending
the event to a backend.

**Why this priority**: The product has no value until a correct event instant can be created and
shared.

**Independent Test**: Create an event in `Europe/Amsterdam`, copy its link, open that link in a
fresh browser context, and verify the same instant and optional name are shown.

**Acceptance Scenarios**:

1. **Given** a browser with capable native date and time inputs, **When** the creator opens the
   form, **Then** the browser-native controls are available and clearly labelled.
2. **Given** a browser without a usable native picker, **When** the creator opens the form, **Then**
   an accessible enhanced date and time entry experience is available.
3. **Given** the creator types `ams` in time-zone search, **When** suggestions appear, **Then**
   `Europe/Amsterdam` is one of the first visible matches.
4. **Given** valid event details and a confirmed IANA time zone, **When** the creator activates the
   share action, **Then** a readable URL is copied and a non-disruptive confirmation is announced.
5. **Given** a local time that is ambiguous or nonexistent due to a daylight-saving transition,
   **When** the creator attempts to share it, **Then** the conflict is explained and sharing remains
   unavailable until the creator explicitly resolves it.
6. **Given** the event name is empty, **When** the creator shares the event, **Then** the link
   remains valid and the recipient sees a localized generic event label.
7. **Given** the platform supports native sharing, **When** the creator activates the share action,
   **Then** the operating-system share sheet opens with a localized summary of the source date,
   source time, source zone, and event URL.

---

### User Story 2 - View the Event in My Time Zone (Priority: P1)

A recipient opens a shared link and immediately sees the event date, time, time-zone name, and
relative timing in their device time zone, while retaining the source time for context.

**Why this priority**: The primary outcome is removing the mental work and risk from cross-time-zone
conversion.

**Independent Test**: Open one shared event while emulating at least three device time zones and
verify that every display refers to the same instant.

**Acceptance Scenarios**:

1. **Given** a valid event link, **When** it opens, **Then** the recipient sees the event in their
   detected device time zone and the creator's source time zone.
2. **Given** the event crosses a calendar-day boundary in the recipient's time zone, **When** the
   link opens, **Then** the recipient's correct local date is prominent.
3. **Given** a malformed, incomplete, or impossible event link, **When** it opens, **Then** the
   recipient sees a clear localized error and a path to create a new event.
4. **Given** an event in the past or future, **When** it opens, **Then** a localized relative-time
   summary accurately describes its status without replacing the exact date and time.

---

### User Story 3 - Explore Another Location (Priority: P2)

A recipient moves an interactive digital globe or uses an accessible search interface to choose any
cataloged country, GeoNames city, or time zone and see the event time there.

**Why this priority**: It supports travel and distributed groups while providing an engaging visual
experience and an equivalent accessible path.

**Independent Test**: Select locations through both globe and search, including a multi-zone
country, and verify the event is converted only after an exact time zone is selected.

**Acceptance Scenarios**:

1. **Given** the event viewer is online or has previously cached the globe resources, **When** the
   recipient rotates and selects on the globe, **Then** the selected area is identified and relevant
   time-zone choices are offered.
2. **Given** the globe cannot load, motion is reduced, or the recipient uses keyboard or assistive
   technology, **When** they choose the search option, **Then** all conversion capabilities remain
   available without the globe.
3. **Given** a country spans multiple time zones, **When** the recipient selects it, **Then** the
   interface requires an exact city or IANA time zone before showing a converted time.
4. **Given** the recipient types a partial city or identifier, **When** results appear, **Then**
   fuzzy matching ranks likely time zones ahead of weak matches.
5. **Given** a city with more than 500 residents or an administrative seat exists in the pinned
   GeoNames catalog, **When** the recipient types the beginning of its name, **Then** the city and
   exact IANA time zone are available for selection.

---

### User Story 4 - Use Location Services Transparently (Priority: P2)

A creator or recipient can ask the browser for their location to narrow down their time zone.
Coordinates remain in the browser. Country-name lookup is optional and requires a second, separate
consent before coordinates are sent to the named reverse-geocoding provider.

**Why this priority**: Location can reduce effort, but only if the product earns trust through
minimization and informed consent.

**Independent Test**: Exercise permission granted, denied, unavailable, and offline paths; inspect
network requests to confirm no coordinates leave the browser before the separate country-lookup
consent.

**Acceptance Scenarios**:

1. **Given** location has not been requested, **When** the user views the location option, **Then**
   the interface explains what the browser returns, what remains local, and that permission is
   optional.
2. **Given** the user explicitly enables location, **When** the browser returns coordinates,
   **Then** the app derives likely time-zone choices locally and still asks the user to confirm one.
3. **Given** coordinates are available, **When** the user is offered automatic country naming,
   **Then** the provider, exact data sent, purpose, and returned fields are shown before a separate
   consent action.
4. **Given** the user declines country lookup, denies browser permission, is offline, or the
   provider fails, **When** the flow continues, **Then** country and time-zone search remain fully
   usable.
5. **Given** the user leaves or refreshes the page, **When** they return, **Then** the application
   has not retained coordinates, consent choices, or derived location data.

---

### User Story 5 - Personalize and Use Offline (Priority: P3)

A user can switch among system, light, and dark themes and between English and Dutch. After the
first successful visit, core event creation and viewing continue to work offline without storing
event data.

**Why this priority**: These capabilities improve comfort, inclusion, and reliability without
changing the core event conversion.

**Independent Test**: Install or revisit the application, disable the network, then create and open
a previously copied event link while switching theme and language.

**Acceptance Scenarios**:

1. **Given** no theme was selected during the current visit, **When** the application opens,
   **Then** it follows the operating-system color preference.
2. **Given** the user selects system, light, or dark, **When** the selection changes, **Then** the
   complete interface updates immediately without a flash or reload.
3. **Given** the user switches between English and Dutch, **When** the selection changes, **Then**
   controls, errors, privacy explanations, dates, and relative times use the selected language.
4. **Given** the application has completed a successful online visit, **When** it is reopened
   offline, **Then** event creation, share-link parsing, time-zone search, and conversion work;
   network-only country naming clearly remains unavailable.
5. **Given** the application cache is inspected, **When** stored entries are reviewed, **Then** they
   contain only versioned application assets and public reference data, never event details,
   coordinates, or user choices.
6. **Given** a new release updates country or time-zone reference data, **When** the release is
   validated, **Then** automated checks cover every supported country and IANA time zone and report
   any unmapped, duplicate, or invalid entry.

### Edge Cases

- The device time zone is unavailable, invalid, or different from the browser locale.
- The event occurs during a half-hour or quarter-hour offset, crosses the International Date Line,
  or spans a daylight-saving rule change between creation and viewing.
- A shared event date lies outside the reliable supported range of the user's browser.
- Clipboard access is denied or unavailable; the user must still be able to select and copy the
  generated link manually.
- The optional event name contains emoji, non-Latin text, punctuation, or URL-reserved characters.
- Search input contains accents, alternate city spellings, common abbreviations, or an IANA
  identifier fragment such as `ams`.
- Browser geolocation returns low-accuracy coordinates near a country or time-zone border.
- The reverse-geocoding service rate-limits, times out, changes response shape, or is unreachable
  because the app is offline.
- WebGL is unavailable, disabled, resource-constrained, or causes context loss.
- A user has reduced motion, high contrast, forced colors, 200% zoom, or a narrow mobile viewport
  enabled.
- The app is hosted below a repository subpath and a shared URL is opened directly.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The application MUST let a creator enter an optional event name and a required local
  date and time.
- **FR-002**: The application MUST prefer capable system date/time controls and provide an
  accessible enhanced fallback where they are insufficient.
- **FR-003**: The application MUST require confirmation of an exact IANA source time zone before
  generating a share link.
- **FR-004**: Time-zone search MUST use fuzzy matching across IANA identifiers, cities, countries,
  and common aliases; `ams` MUST surface `Europe/Amsterdam` prominently.
- **FR-005**: The application MUST detect ambiguous and nonexistent local times caused by
  daylight-saving transitions and require explicit resolution.
- **FR-006**: The application MUST generate readable, URL-safe share parameters that preserve the
  event name when present, local date/time, source time zone, and event instant.
- **FR-007**: The application MUST support clipboard copying and expose a selectable-link fallback
  when clipboard access is unavailable.
- **FR-008**: A valid shared link MUST immediately show the event in the recipient's device time
  zone while retaining the source-zone date and time.
- **FR-009**: The event viewer MUST display the exact local date/time, time-zone label, UTC offset,
  and a relative-time summary.
- **FR-010**: Invalid shared-link data MUST be rejected with a localized explanation and recovery
  action; it MUST NOT silently fall back to a different instant.
- **FR-011**: The recipient MUST be able to explore locations on an interactive globe and through an
  equivalent accessible search interface.
- **FR-012**: Country selection MUST require an exact time-zone or city confirmation whenever more
  than one time zone is possible.
- **FR-013**: Browser geolocation MUST be initiated only by an explicit action and preceded by a
  plain-language disclosure.
- **FR-014**: Coordinates obtained through browser geolocation MUST remain in-browser while likely
  IANA time zones are derived.
- **FR-015**: Sending coordinates to a reverse-geocoding provider for country naming MUST require a
  separate consent that names the provider, identifies the transmitted and returned fields, and
  explains the purpose.
- **FR-016**: Declined, denied, unavailable, imprecise, offline, and failed location flows MUST
  preserve manual country and time-zone selection.
- **FR-017**: The application MUST provide system, light, and dark theme options and honor
  reduced-motion and forced-color preferences.
- **FR-018**: The application MUST provide complete English and Dutch interfaces, including
  validation, privacy, offline, date, and relative-time content.
- **FR-019**: Core creation, link parsing, time-zone search, and conversion MUST work offline after
  one successful online visit.
- **FR-020**: Persistent browser storage MUST contain only versioned application assets and public
  reference data required for offline operation; event data, coordinates, consents, theme, and
  language choices MUST remain ephemeral.
- **FR-021**: The application MUST be installable where the browser supports web-app installation
  and MUST clearly communicate offline/network-only boundaries.
- **FR-022**: The application MUST work when hosted at a GitHub Pages repository subpath and remain
  portable to a different static host without changing share-link meaning.
- **FR-023**: The primary workflows MUST be keyboard operable, screen-reader labelled, usable at
  200% zoom, and compliant with WCAG 2.2 AA contrast requirements.
- **FR-024**: The application MUST make no analytics, advertising, fingerprinting, or
  location-related network requests except the separately consented country lookup.
- **FR-025**: Country, time-zone, boundary, and localization reference data MUST be traceable to
  authoritative or well-established public sources, with source name, version, license, retrieval
  date, and transformation steps documented.
- **FR-026**: Automated unit and end-to-end validation MUST exercise the complete supported country
  and IANA time-zone catalogs, including mapping completeness, search reachability, conversion
  validity, and representative daylight-saving transitions.
- **FR-027**: City search MUST include every record from a pinned GeoNames cities500 snapshot (all
  cities over 500 residents or administrative seats), work offline after the application is cached,
  and map each result to a supported country and IANA zone.
- **FR-028**: The creator MUST be able to invoke the platform Web Share API with a localized event
  summary and URL; when native sharing is unavailable, the same complete message MUST be copied to
  the clipboard.
- **FR-029**: Users MUST be able to switch between 24-hour and AM/PM time display from the header;
  the choice applies immediately to event cards and native-share text and remains ephemeral.
- **FR-030**: The event viewer's primary location field MUST search both countries and cities, and
  selecting a city MUST choose its mapped country and exact IANA time zone.
- **FR-031**: A globe preview MUST be visible by default on the event viewer, and activating it MUST
  load the movable interactive globe while retaining a control to close it.

### Key Entities

- **Event**: The optional name, source local date/time, confirmed source IANA time zone, and the
  resulting unambiguous instant represented in a share link.
- **Time-Zone Choice**: An IANA identifier with searchable city, country, alias, and current offset
  information used for explicit confirmation and conversion.
- **Location Result**: Ephemeral coordinates, accuracy, locally derived time-zone candidates, and
  optionally consented country-name response; never persisted.
- **Display Context**: The active ephemeral language, theme mode, selected comparison location, and
  browser accessibility preferences.
- **Share Link**: A readable, versioned set of URL parameters sufficient to validate and reconstruct
  an Event without server state.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 90% of first-time test participants can create and copy a valid event link in
  under 90 seconds without assistance.
- **SC-002**: For a test set covering all representative UTC offsets and daylight-saving
  transitions, 100% of displayed recipient times represent the same event instant.
- **SC-003**: Time-zone suggestions appear within 300 milliseconds for typical searches on a
  mid-range mobile device, and `Europe/Amsterdam` appears within the first five results for `ams`.
- **SC-004**: A recipient sees the converted event summary within 2 seconds of opening a cached link
  on a mid-range mobile device, excluding optional globe loading.
- **SC-005**: Core event creation, parsing, search, and conversion complete successfully with the
  network disabled after one online visit.
- **SC-006**: Automated accessibility evaluation reports no serious or critical issues, and every
  primary workflow is completed using only a keyboard at 200% zoom.
- **SC-007**: Network inspection confirms that coordinates are never transmitted before the separate
  country-lookup consent and that no analytics or tracking requests occur.
- **SC-008**: Storage inspection confirms zero persisted event, coordinate, consent, theme, or
  language records.
- **SC-009**: All user-facing content required for the primary workflows is available in both
  English and Dutch.
- **SC-010**: The same production artifact works at a repository subpath and at a static host root
  while preserving existing share links.
- **SC-011**: Every supported IANA time zone and country passes automated catalog, search, and
  conversion checks; no supported entry is unreachable through the user interface.
- **SC-012**: Every bundled reference-data artifact identifies its upstream source, version,
  license, retrieval date, and reproducible transformation process.
- **SC-013**: All city records from the pinned GeoNames snapshot pass automated country/time-zone
  mapping and search-shard reachability checks.

## Assumptions

- Modern evergreen browsers are the primary target, with graceful fallback for browsers that lack
  WebGL, clipboard access, installation prompts, or advanced date controls.
- The browser's device time zone is the initial recipient default, but it is never treated as proof
  of physical location.
- Public time-zone and country reference data can be bundled and cached because it contains no user
  data.
- IANA Time Zone Database identifiers, Unicode locale data, ISO country identifiers, and reputable
  open geographic boundary sources are preferred over hand-maintained lists; derived datasets will
  remain reproducible and license-compliant.
- The optional reverse-geocoding provider is used only for a friendly country name; the product
  remains complete without it.
- Share links may expose the optional event name to anyone who receives or observes the URL, and the
  interface will disclose this before copying.
- Theme and language selections apply only to the current page lifetime to satisfy the
  no-persistence requirement.
- The first release does not include invitations, reminders, calendars, authentication, analytics,
  backend synchronization, or link shortening.
