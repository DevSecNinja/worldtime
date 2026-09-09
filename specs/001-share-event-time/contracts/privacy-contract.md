# Privacy Contract

## Persistent state

The application MUST NOT write user choices, event data, location data, consent records, or viewed
links to cookies, localStorage, sessionStorage, IndexedDB, file storage, or telemetry.

Cache Storage may contain only:

- hashed application JavaScript and CSS;
- HTML shell and web-app manifest;
- same-origin icons, fonts, and visual assets;
- generated public country/time-zone reference data;

## Network actions

| User action               | Permitted requests                                          |
| ------------------------- | ----------------------------------------------------------- |
| Open application          | Same-origin static assets                                   |
| Create/view/convert event | None                                                        |
| Search country/time zone  | None                                                        |
| Enable browser location   | No app-originated request; browser/OS behavior is disclosed |
| Consent to country lookup | One direct Nominatim reverse-geocoding request              |

## Country lookup disclosure

Before calling Nominatim, the interface MUST disclose:

- Recipient: OpenStreetMap Foundation Nominatim service.
- Sent: latitude, longitude, requested response language, and normal network metadata including IP
  address and the application's origin.
- Purpose: obtain a friendly country name and country code.
- Returned: reverse-geocoded address metadata; the app reads only country and country code.
- Retention: controlled by the provider's published policy, not this application.
- Choice: declining or failure leaves full manual search available.

The request uses omitted credentials, no-store caching, and a strict-origin referrer so the provider
can identify the application without receiving paths or event fragments. It is not handled by the
service worker.
