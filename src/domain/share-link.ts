import { Temporal } from 'temporal-polyfill';

import type { EventPayload, Locale, TimeFormat } from './event';
import {
  formatSourceRepresentation,
  isSupportedTimeZone,
  isValidEventName,
  parseLocalDateTime,
  validateEventInvariant,
} from './temporal';

const KNOWN_KEYS = ['v', 'name', 'local', 'tz', 'offset', 'at'] as const;

export type ShareLinkResult =
  | { ok: true; event: EventPayload; }
  | {
    ok: false;
    error:
      | 'duplicate'
      | 'version'
      | 'incomplete'
      | 'timezone'
      | 'offset'
      | 'name'
      | 'inconsistent'
      | 'datetime';
  };

export function serializeEvent(event: EventPayload): string {
  if (!validateEventInvariant(event)) {
    throw new RangeError('Cannot serialize an inconsistent event.');
  }
  const params = new URLSearchParams();
  params.set('v', '1');
  if (event.name) params.set('name', event.name);
  params.set('local', event.local);
  params.set('tz', event.sourceTimeZone);
  params.set('offset', event.sourceOffset);
  params.set('at', event.instant);
  return params.toString();
}

export function buildShareUrl(event: EventPayload, pageUrl = globalThis.location?.href): string {
  if (!pageUrl) throw new RangeError('A page URL is required.');
  const url = new URL(pageUrl);
  url.search = '';
  url.hash = serializeEvent(event);
  return url.toString();
}

export function buildNativeShareData(
  event: EventPayload,
  locale: Locale,
  url: string,
  timeFormat: TimeFormat = 'h23',
): ShareData {
  const source = formatSourceRepresentation(event, locale, timeFormat);
  const eventSubject = event.name
    ? locale === 'nl' ? `Het evenement “${event.name}”` : `The event “${event.name}”`
    : locale === 'nl'
    ? 'Dit evenement'
    : 'This event';

  return locale === 'nl'
    ? {
      title: event.name ?? 'Worldtime-evenement',
      text: `${eventSubject} vindt plaats op ${source.date} om ${source.time} `
        + `in ${source.zone} (UTC${source.offset === '+00:00' ? '' : source.offset}). `
        + 'Open Worldtime om het tijdstip in jouw lokale tijd te bekijken.',
      url,
    }
    : {
      title: event.name ?? 'Worldtime event',
      text: `${eventSubject} takes place on ${source.date} at ${source.time} `
        + `in ${source.zone} (UTC${source.offset === '+00:00' ? '' : source.offset}). `
        + 'Open Worldtime to see the time where you are.',
      url,
    };
}

export function parseEventFragment(fragment: string): ShareLinkResult {
  try {
    const normalized = fragment.startsWith('#') ? fragment.slice(1) : fragment;
    const params = new URLSearchParams(normalized);
    for (const key of KNOWN_KEYS) {
      if (params.getAll(key).length > 1) {
        return { ok: false, error: 'duplicate' };
      }
    }
    if (params.get('v') !== '1') {
      return { ok: false, error: 'version' };
    }

    const local = params.get('local');
    const sourceTimeZone = params.get('tz');
    const sourceOffset = params.get('offset');
    const instant = params.get('at');
    if (!local || !sourceTimeZone || !sourceOffset || !instant) {
      return { ok: false, error: 'incomplete' };
    }
    parseLocalDateTime(local);
    if (!isSupportedTimeZone(sourceTimeZone)) {
      return { ok: false, error: 'timezone' };
    }
    if (!/^(Z|[+-]\d{2}:\d{2})$/.test(sourceOffset)) {
      return { ok: false, error: 'offset' };
    }
    Temporal.Instant.from(instant);

    const name = params.get('name')?.trim() || null;
    if (name && !isValidEventName(name)) {
      return { ok: false, error: 'name' };
    }

    const event: EventPayload = {
      version: 1,
      name,
      local,
      sourceTimeZone,
      sourceOffset,
      instant,
    };
    return validateEventInvariant(event)
      ? { ok: true, event }
      : { ok: false, error: 'inconsistent' };
  } catch {
    return { ok: false, error: 'datetime' };
  }
}
