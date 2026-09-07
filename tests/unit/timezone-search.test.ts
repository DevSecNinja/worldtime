import { describe, expect, it } from 'vitest';

import {
  COUNTRIES,
  searchCountries,
  searchTimeZones,
  TIME_ZONES,
} from '../../src/domain/timezone-search';

describe('time-zone and country search', () => {
  it('ranks Europe/Amsterdam for the ams alias', () => {
    const results = searchTimeZones('ams');
    expect(results.map((zone) => zone.id).slice(0, 5)).toContain('Europe/Amsterdam');
  });

  it('makes every supported time zone reachable by identifier', () => {
    for (const zone of TIME_ZONES) {
      expect(
        searchTimeZones(zone.id, 8).some((result) => result.id === zone.id),
        zone.id,
      ).toBe(true);
    }
  });

  it('makes every country reachable in English and Dutch', () => {
    for (const country of COUNTRIES) {
      expect(
        searchCountries(country.names.en, 'en', 12)
          .some((result) => result.alpha2 === country.alpha2),
        `${country.alpha2} English`,
      ).toBe(true);
      expect(
        searchCountries(country.names.nl, 'nl', 12)
          .some((result) => result.alpha2 === country.alpha2),
        `${country.alpha2} Dutch`,
      ).toBe(true);
    }
  });
});
