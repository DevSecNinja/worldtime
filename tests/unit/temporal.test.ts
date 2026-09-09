import moment from 'moment-timezone';
import { describe, expect, it } from 'vitest';

import timeZoneAliases from '../../src/data/generated/time-zone-aliases.json';
import timeZones from '../../src/data/generated/timezones.json';
import {
  canonicalTimeZone,
  classifyWallTime,
  createEventPayload,
  formatEventInZone,
  sourceRulesChanged,
  validateEventInvariant,
} from '../../src/domain/temporal';

describe('Temporal event conversion', () => {
  it('classifies every supported zone at representative instants', () => {
    for (const zone of timeZones) {
      for (const local of ['2026-01-15T12:00', '2026-07-15T12:00']) {
        const classification = classifyWallTime(local, zone.id);
        expect(classification.kind, `${zone.id} at ${local}`).toBe('valid');
        if (classification.kind === 'valid') {
          const event = createEventPayload('', local, zone.id);
          expect(validateEventInvariant(event), zone.id).toBe(true);
          expect(formatEventInZone(event, zone.id, 'en').zone).toBe(zone.id);
        }
      }
    }
  });

  it('detects Amsterdam spring gap and requires an adjustment', () => {
    const classification = classifyWallTime('2026-03-29T02:30', 'Europe/Amsterdam');
    expect(classification.kind).toBe('nonexistent');
    expect(() => createEventPayload('', '2026-03-29T02:30', 'Europe/Amsterdam')).toThrow(
      /explicit/,
    );
    const adjusted = createEventPayload(
      '',
      '2026-03-29T02:30',
      'Europe/Amsterdam',
      'later',
    );
    expect(adjusted.local).toBe('2026-03-29T03:30');
    expect(adjusted.sourceOffset).toBe('+02:00');
  });

  it('detects both Amsterdam autumn occurrences', () => {
    const classification = classifyWallTime('2026-10-25T02:30', 'Europe/Amsterdam');
    expect(classification.kind).toBe('ambiguous');
    const earlier = createEventPayload(
      '',
      '2026-10-25T02:30',
      'Europe/Amsterdam',
      'earlier',
    );
    const later = createEventPayload(
      '',
      '2026-10-25T02:30',
      'Europe/Amsterdam',
      'later',
    );
    expect(earlier.sourceOffset).toBe('+02:00');
    expect(later.sourceOffset).toBe('+01:00');
    expect(earlier.instant).not.toBe(later.instant);
  });

  it.each([
    ['Asia/Kathmandu', '+05:45'],
    ['Australia/Eucla', '+08:45'],
    ['Pacific/Chatham', '+13:45'],
    ['America/St_Johns', '-03:30'],
  ])('preserves non-hour offsets in %s', (zone, expectedOffset) => {
    const event = createEventPayload('', '2026-01-15T12:00', zone);
    expect(event.sourceOffset).toBe(expectedOffset);
  });

  it('supports wall times at both documented range boundaries', () => {
    expect(
      validateEventInvariant(createEventPayload('', '1970-01-01T00:00', 'Asia/Tokyo')),
    ).toBe(true);
    expect(
      validateEventInvariant(createEventPayload('', '2100-12-31T23:59', 'America/Adak')),
    ).toBe(true);
  });

  it('treats Z and +00:00 as equivalent source offsets', () => {
    expect(sourceRulesChanged({
      version: 1,
      name: null,
      local: '2026-01-15T12:00',
      sourceTimeZone: 'UTC',
      sourceOffset: 'Z',
      instant: '2026-01-15T12:00:00Z',
    })).toBe(false);
  });

  it('canonicalizes legacy IANA aliases before comparison and storage', () => {
    expect(canonicalTimeZone('Asia/Calcutta')).toBe('Asia/Kolkata');
    expect(canonicalTimeZone('America/New_York')).toBe('America/New_York');
    expect(
      createEventPayload('', '2026-01-15T12:00', 'Asia/Calcutta').sourceTimeZone,
    ).toBe('Asia/Kolkata');
  });

  it('maps every generated alias to its authoritative IANA target throughout the supported range', () => {
    for (const [alias, target] of Object.entries(timeZoneAliases)) {
      const aliasZone = moment.tz.zone(alias);
      const targetZone = moment.tz.zone(target);
      expect(aliasZone, alias).not.toBeNull();
      expect(targetZone, target).not.toBeNull();
      for (let year = 1970; year <= 2100; year += 1) {
        for (const month of [0, 6]) {
          const instant = Date.UTC(year, month, 15, 12);
          expect(
            aliasZone?.utcOffset(instant),
            `${alias} -> ${target} at ${year}-${String(month + 1).padStart(2, '0')}`,
          ).toBe(targetZone?.utcOffset(instant));
        }
      }
    }
  });

  it('does not collapse supported zones with historically different rules', () => {
    expect(
      createEventPayload('', '1970-05-01T08:00', 'America/New_York').sourceOffset,
    ).toBe('-04:00');
    expect(
      createEventPayload('', '1970-05-01T08:00', 'America/Detroit').sourceOffset,
    ).toBe('-05:00');
  });
});
