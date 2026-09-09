# Share-Link Contract

## Location

The event payload is encoded as URL fragment parameters after `#`. It is never encoded in the query
string or path.

```text
#v=1&name=Stand-up&local=2026-10-25T02%3A30&tz=Europe%2FAmsterdam&offset=%2B02%3A00&at=2026-10-25T00%3A30%3A00Z
```

## Parameters

| Key      | Required | Format                                            |
| -------- | -------- | ------------------------------------------------- |
| `v`      | yes      | Literal `1`                                       |
| `name`   | no       | UTF-8 URL-encoded string, at most 120 code points |
| `local`  | yes      | `YYYY-MM-DDTHH:mm`                                |
| `tz`     | yes      | Supported IANA identifier                         |
| `offset` | yes      | `Z` or signed `HH:mm` offset                      |
| `at`     | yes      | RFC 3339 UTC instant                              |

## Validation

- Unknown optional parameters are ignored for forward compatibility.
- Duplicate known parameters, unknown versions, missing required fields, invalid values, control
  characters, and unsupported time zones invalidate the link.
- `local` interpreted with `offset` MUST equal `at`.
- `at` is authoritative for recipient conversion.
- If current time-zone rules no longer map `local` in `tz` to `offset`, the source representation is
  shown with a rule-change warning.
- Serialization order is `v`, `name`, `local`, `tz`, `offset`, `at`.

## Compatibility

The fragment is relative to the current static application URL. Moving the same build from a GitHub
Pages subpath to a root host does not alter parameter meaning.
