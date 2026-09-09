import { Temporal } from 'temporal-polyfill';

import type { EventPayload, Locale, TimeFormat } from './event';

export const MIN_EVENT_YEAR = 1970;
export const MAX_EVENT_YEAR = 2100;

interface RuleSegment {
  until: number;
  offsetMinutesWest: number;
}

export interface ResolvedWallTime {
  local: string;
  offset: string;
  instant: string;
  epochMilliseconds: number;
}

export type WallTimeClassification =
  | { kind: 'valid'; value: ResolvedWallTime; }
  | {
    kind: 'ambiguous';
    earlier: ResolvedWallTime;
    later: ResolvedWallTime;
  }
  | {
    kind: 'nonexistent';
    earlier: ResolvedWallTime;
    later: ResolvedWallTime;
  }
  | { kind: 'invalid'; message: string; };

export type WallTimeResolution = 'earlier' | 'later';

let timeZoneRules: Record<string, RuleSegment[]> = {};
let supportedTimeZones = new Set<string>();
let timeZoneAliases: Record<string, string> = {};

export function initializeTimeZoneRules(
  rules: Record<string, RuleSegment[]>,
  aliases: Record<string, string> = {},
): void {
  timeZoneRules = rules;
  supportedTimeZones = new Set(Object.keys(rules));
  timeZoneAliases = aliases;
}

export function hasTimeZoneRules(): boolean {
  return supportedTimeZones.size > 0;
}

const pad = (value: number, width = 2) => String(value).padStart(width, '0');

const localStringFromEpoch = (epochMilliseconds: number): string => {
  const date = new Date(epochMilliseconds);
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
    + `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
};

const offsetString = (offsetMinutesWest: number): string => {
  const offsetMinutesEast = -offsetMinutesWest;
  if (offsetMinutesEast === 0) return '+00:00';
  const sign = offsetMinutesEast >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutesEast);
  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
};

const offsetAt = (timeZone: string, epochMilliseconds: number): number => {
  const rules = timeZoneRules[canonicalTimeZone(timeZone)];
  if (!rules) throw new RangeError('Unsupported time zone.');
  const segment = rules.find(({ until }) => epochMilliseconds < until);
  if (!segment) throw new RangeError('The event is outside the supported 1970-2100 range.');
  return segment.offsetMinutesWest;
};

const resolvedAt = (timeZone: string, epochMilliseconds: number): ResolvedWallTime => {
  const offsetMinutesWest = offsetAt(timeZone, epochMilliseconds);
  const localEpoch = epochMilliseconds - offsetMinutesWest * 60_000;
  return {
    local: localStringFromEpoch(localEpoch),
    offset: offsetString(offsetMinutesWest),
    instant: Temporal.Instant.fromEpochMilliseconds(epochMilliseconds).toString(),
    epochMilliseconds,
  };
};

export function isSupportedTimeZone(timeZone: string): boolean {
  return supportedTimeZones.has(canonicalTimeZone(timeZone));
}

export function canonicalTimeZone(timeZone: string): string {
  return timeZoneAliases[timeZone] ?? timeZone;
}

export function parseLocalDateTime(local: string): Temporal.PlainDateTime {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) {
    throw new RangeError('Local date and time must use YYYY-MM-DDTHH:mm.');
  }
  const parsed = Temporal.PlainDateTime.from(local, { overflow: 'reject' });
  if (parsed.year < MIN_EVENT_YEAR || parsed.year > MAX_EVENT_YEAR) {
    throw new RangeError(`Event years must be between ${MIN_EVENT_YEAR} and ${MAX_EVENT_YEAR}.`);
  }
  return parsed;
}

export function isValidEventName(name: string): boolean {
  const trimmedName = name.trim();
  return [...trimmedName].length <= 120 && !/[\p{Cc}\p{Cf}]/u.test(trimmedName);
}

export function classifyWallTime(localValue: string, timeZone: string): WallTimeClassification {
  try {
    if (!isSupportedTimeZone(timeZone)) {
      return { kind: 'invalid', message: 'Unsupported time zone.' };
    }
    const canonicalZone = canonicalTimeZone(timeZone);
    const local = parseLocalDateTime(localValue);
    const localEpoch = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
    );
    const uniqueOffsets = [
      ...new Set(timeZoneRules[canonicalZone].map(({ offsetMinutesWest }) => offsetMinutesWest)),
    ];
    const candidates = uniqueOffsets
      .map((offsetMinutesWest) => localEpoch + offsetMinutesWest * 60_000)
      .filter((epoch, index, values) => values.indexOf(epoch) === index)
      .map((epoch) => resolvedAt(canonicalZone, epoch))
      .sort((left, right) => left.epochMilliseconds - right.epochMilliseconds);
    const valid = candidates.filter((candidate) => candidate.local === localValue);

    if (valid.length === 1) return { kind: 'valid', value: valid[0] };
    if (valid.length > 1) {
      return {
        kind: 'ambiguous',
        earlier: valid[0],
        later: valid[valid.length - 1],
      };
    }

    const earlierCandidates = candidates
      .filter((candidate) => candidate.local < localValue)
      .sort((left, right) => right.local.localeCompare(left.local));
    const laterCandidates = candidates
      .filter((candidate) => candidate.local > localValue)
      .sort((left, right) => left.local.localeCompare(right.local));
    if (earlierCandidates[0] && laterCandidates[0]) {
      return {
        kind: 'nonexistent',
        earlier: earlierCandidates[0],
        later: laterCandidates[0],
      };
    }
    return { kind: 'invalid', message: 'The local time cannot be resolved.' };
  } catch (error) {
    return {
      kind: 'invalid',
      message: error instanceof Error ? error.message : 'Invalid date or time.',
    };
  }
}

export function createEventPayload(
  name: string,
  localValue: string,
  timeZone: string,
  resolution?: WallTimeResolution,
): EventPayload {
  const classification = classifyWallTime(localValue, timeZone);
  if (classification.kind === 'invalid') {
    throw new RangeError(classification.message);
  }
  if (classification.kind !== 'valid' && !resolution) {
    throw new RangeError('This local time requires an explicit daylight-saving resolution.');
  }

  const resolved = classification.kind === 'valid'
    ? classification.value
    : classification[resolution as WallTimeResolution];
  const trimmedName = name.trim();
  if (!isValidEventName(trimmedName)) {
    throw new RangeError('The event name is too long or contains control characters.');
  }

  return {
    version: 1,
    name: trimmedName || null,
    local: resolved.local,
    sourceTimeZone: canonicalTimeZone(timeZone),
    sourceOffset: resolved.offset,
    instant: resolved.instant,
  };
}

export function validateEventInvariant(event: EventPayload): boolean {
  try {
    if (!isSupportedTimeZone(event.sourceTimeZone)) return false;
    parseLocalDateTime(event.local);
    const instantFromLocal = Temporal.Instant.from(`${event.local}${event.sourceOffset}`);
    const instant = Temporal.Instant.from(event.instant);
    return instantFromLocal.equals(instant);
  } catch {
    return false;
  }
}

export function sourceRulesChanged(event: EventPayload): boolean {
  const current = resolvedAt(
    event.sourceTimeZone,
    Number(Temporal.Instant.from(event.instant).epochMilliseconds),
  );
  const encodedOffset = event.sourceOffset === 'Z' ? '+00:00' : event.sourceOffset;
  return current.local !== event.local || current.offset !== encodedOffset;
}

export function formatSourceRepresentation(
  event: EventPayload,
  locale: Locale,
  timeFormat: TimeFormat = 'h23',
): { date: string; time: string; zone: string; offset: string; } {
  const local = parseLocalDateTime(event.local);
  const localEpoch = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
  );
  return {
    date: new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(localEpoch),
    time: new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: timeFormat,
    }).format(localEpoch),
    zone: event.sourceTimeZone,
    offset: event.sourceOffset === 'Z' ? '+00:00' : event.sourceOffset,
  };
}

export function formatEventInZone(
  event: EventPayload,
  timeZone: string,
  locale: Locale,
  timeFormat: TimeFormat = 'h23',
): {
  date: string;
  time: string;
  zone: string;
  offset: string;
  relative: string;
} {
  const instant = Temporal.Instant.from(event.instant);
  const epoch = Number(instant.epochMilliseconds);
  const resolved = resolvedAt(timeZone, epoch);
  const offsetMinutesWest = offsetAt(timeZone, epoch);
  const localEpoch = epoch - offsetMinutesWest * 60_000;
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(localEpoch);
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: timeFormat,
  }).format(localEpoch);
  const deltaMinutes = Math.round((epoch - Date.now()) / 60_000);
  const absMinutes = Math.abs(deltaMinutes);
  const [value, unit] = absMinutes >= 2_880
    ? [Math.round(deltaMinutes / 1_440), 'day']
    : absMinutes >= 120
    ? [Math.round(deltaMinutes / 60), 'hour']
    : [deltaMinutes, 'minute'];

  return {
    date,
    time,
    zone: timeZone,
    offset: resolved.offset,
    relative: new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
      value,
      unit as Intl.RelativeTimeFormatUnit,
    ),
  };
}

export function currentDeviceTimeZone(): string {
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const canonical = canonicalTimeZone(detected);
  return canonical && isSupportedTimeZone(canonical) ? canonical : 'UTC';
}
