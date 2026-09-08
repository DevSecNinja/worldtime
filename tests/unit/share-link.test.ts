import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  buildNativeShareData,
  buildShareUrl,
  parseEventFragment,
  serializeEvent,
} from '../../src/domain/share-link';
import { createEventPayload } from '../../src/domain/temporal';

describe('share-link contract', () => {
  it('round-trips Unicode event names in readable fragment parameters', () => {
    const event = createEventPayload(
      'Team sync 🚀 / équipe',
      '2026-09-08T09:30',
      'Europe/Amsterdam',
    );
    const fragment = serializeEvent(event);
    expect(fragment).toContain('tz=Europe%2FAmsterdam');
    expect(parseEventFragment(fragment)).toEqual({ ok: true, event });
    expect(buildShareUrl(event, 'https://example.test/worldtime/?ignored=1#old'))
      .toBe(`https://example.test/worldtime/#${fragment}`);
  });

  it('rejects duplicate, incomplete, and inconsistent values', () => {
    expect(parseEventFragment('#v=1&v=1')).toMatchObject({ ok: false });
    expect(parseEventFragment('#v=1&local=2026-01-01T12%3A00')).toMatchObject({ ok: false });
    expect(
      parseEventFragment(
        '#v=1&local=2026-01-01T12%3A00&tz=UTC&offset=Z&at=2026-01-01T13%3A00%3A00Z',
      ),
    ).toMatchObject({ ok: false });
  });

  it('round-trips all safe generated names', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 80 }).filter((value) => !/[\u0000-\u001f\u007f]/u.test(value)),
        (name) => {
          const event = createEventPayload(name, '2026-06-15T12:15', 'UTC');
          expect(parseEventFragment(serializeEvent(event))).toEqual({ ok: true, event });
        },
      ),
      { numRuns: 250 },
    );
  });

  it('builds localized native-share text with source time and URL', () => {
    const event = createEventPayload(
      'Launch',
      '2026-09-08T09:30',
      'Europe/Amsterdam',
    );
    const url = buildShareUrl(event, 'https://example.test/worldtime/');
    const english = buildNativeShareData(event, 'en', url);
    const dutch = buildNativeShareData(event, 'nl', url);

    expect(english).toMatchObject({ title: 'Launch', url });
    expect(english.text).toContain('The event “Launch”');
    expect(english.text).toContain('09:30');
    expect(english.text).toContain('Europe/Amsterdam (UTC+02:00)');
    expect(english.text).toContain('see the time where you are');
    expect(dutch.text).toContain('Het evenement “Launch”');
    expect(dutch.text).toContain('jouw lokale tijd');

    const twelveHour = buildNativeShareData(event, 'en', url, 'h12');
    expect(twelveHour.text).toMatch(/9:30 AM/i);
  });
});
