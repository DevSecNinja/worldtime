<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Added principles:
  - I. Privacy by Design
  - II. Time-Zone Correctness
  - III. Accessible Progressive Enhancement
  - IV. Offline-First Performance
  - V. Spec-Driven, Tested Delivery
- Added sections:
  - Product and Platform Constraints
  - Development Workflow and Quality Gates
- Removed sections: none
- Deferred TODOs: none
-->

# Worldtime Constitution

## Core Principles

### I. Privacy by Design

The application MUST work without accounts or a backend. Event data MUST exist only in the current
page state and in user-created share URLs. It MUST NOT be persisted in cookies, localStorage,
IndexedDB, telemetry, or analytics. Browser geolocation MUST be requested only after an explicit
user action, coordinates MUST stay in the browser, and any optional reverse-geocoding request MUST
require separate informed consent that identifies the recipient, data sent, purpose, and response.
PWA Cache Storage is the only persistence exception and MUST contain application assets, never event
or location data. Rationale: a shareable time converter does not need to build a record of its
users.

### II. Time-Zone Correctness

Every event MUST be anchored to an IANA time-zone identifier and converted with time-zone-aware date
handling. Country selection alone MUST NOT determine an event time because countries can span
multiple zones. The creator MUST confirm the source time zone, and ambiguous or nonexistent
wall-clock times during daylight-saving transitions MUST be detected and resolved explicitly. Share
links MUST preserve the event instant and source-zone context without depending on the viewer's
device settings. Rationale: an attractive experience is valueless if it communicates the wrong
instant.

### III. Accessible Progressive Enhancement

Core creation, sharing, and viewing flows MUST be usable with semantic controls, a keyboard,
assistive technology, zoom, and reduced motion. The interactive globe MUST have an equivalent
searchable country and time-zone interface. Native date/time inputs MUST be preferred where capable,
with an accessible enhanced fallback. Color contrast MUST meet WCAG 2.2 AA, and theme choice MUST
support system, light, and dark modes without making content dependent on color alone. Rationale:
the visual experience is an enhancement, not a gate.

### IV. Offline-First Performance

After a successful first visit, the application shell and data required for time-zone search and
conversion MUST work offline. Optional network-only capabilities MUST fail clearly and leave a
complete manual fallback. The initial experience MUST be responsive on current mobile and desktop
browsers, avoid unnecessary dependencies, honor reduced motion and reduced data preferences, and
keep the globe from blocking the core event details. Rationale: shared event links are often opened
while travelling or on unreliable connections.

### V. Spec-Driven, Tested Delivery

The specification, plan, and task list MUST remain the source of product intent. Time-zone parsing,
daylight-saving edge cases, share-link compatibility, localization, offline behavior, and primary
user journeys MUST have automated coverage. Accessibility checks and production builds MUST pass
before delivery. Dependencies MUST be reputable, actively maintained, pinned by the lockfile, and
limited to capabilities the project cannot reasonably implement more safely itself. Rationale:
correctness and portability require repeatable evidence rather than visual inspection alone.

## Product and Platform Constraints

- The product MUST remain a frontend-only static web application.
- English and Dutch MUST be first-class and structurally extensible to more locales.
- Event share URLs MUST be readable and contain only the minimum event fields required to
  reconstruct the instant and optional event name.
- Fuzzy time-zone search MUST match identifiers and city aliases; for example, `ams` MUST surface
  `Europe/Amsterdam`.
- Deployment MUST support a GitHub Pages project subpath today without coupling runtime behavior to
  GitHub, so the same build can move to Cloudflare Pages later.
- Location permission, reverse-geocoding consent, and PWA cache persistence MUST be documented in
  plain language in the product and project documentation.
- No analytics, advertising, fingerprinting, or hidden network requests are permitted.

## Development Workflow and Quality Gates

1. Use the GitHub Speckit workflow to specify, plan, task, implement, and converge.
2. Keep changes small enough to review and follow the shared DevSecNinja conventions.
3. Write tests alongside each behavior-bearing module and reproduce DST boundary cases.
4. Run type checks, unit/integration tests, accessibility checks, and the production build before
   considering implementation complete.
5. Review the final static asset graph and runtime network requests against the privacy principle.
6. Document architecture, privacy behavior, offline boundaries, and deployment steps.

## Governance

This constitution governs all feature specifications, implementation plans, tasks, code reviews, and
releases in this repository. Amendments require a documented rationale, an impact review of existing
specifications and code, and a semantic version change: MAJOR for incompatible principle changes,
MINOR for new or materially expanded principles, and PATCH for clarifications. Every pull request
MUST demonstrate compliance or explicitly justify a temporary exception with a tracked remediation
task. The constitution is reviewed whenever product scope, persistence, external services, or the
deployment platform changes.

**Version**: 1.0.0 | **Ratified**: 2026-09-07 | **Last Amended**: 2026-09-07
