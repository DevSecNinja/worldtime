import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  cityPrefixGroup,
  cityShardCandidates,
  cityShardForAsciiName,
  searchCityRecords,
} from '../../src/domain/city-search';
import type { CityRecord } from '../../src/domain/event';

describe('city search', () => {
  it('routes city queries to deterministic shards', () => {
    expect(cityShardForAsciiName('Amsterdam')).toBe('am');
    expect(cityShardForAsciiName('AEroskobing')).toBe('ae');
    expect(cityShardForAsciiName('a')).toBe('a_');
    expect(cityShardCandidates([['seat', ['se']]], 'Seattle')).toEqual(['se']);
    expect(cityPrefixGroup('Seattle')).toBe('s');
    expect(cityPrefixGroup('Ærøskøbing')).toBe('_');
  });

  it('finds Amsterdam and returns its exact IANA zone', async () => {
    const records = JSON.parse(
      await readFile(resolve(process.cwd(), 'public/data/generated/cities/am.json'), 'utf8'),
    ) as CityRecord[];
    const page = searchCityRecords(records, 'ams', 'en');
    expect(
      page.results.some((city) =>
        city.name === 'Amsterdam' && city.timeZone === 'Europe/Amsterdam'
      ),
    ).toBe(true);
  });

  it('finds native names whose shard differs from their ASCII spelling', async () => {
    const records = JSON.parse(
      await readFile(resolve(process.cwd(), 'public/data/generated/cities/ae.json'), 'utf8'),
    ) as CityRecord[];
    const page = searchCityRecords(records, 'Ærøskøbing', 'en');
    expect(
      page.results.some((city) =>
        city.name === 'Ærøskøbing' && city.timeZone === 'Europe/Copenhagen'
      ),
    ).toBe(true);
  });

  it('uses a country qualifier to disambiguate duplicate city names', async () => {
    const records = JSON.parse(
      await readFile(resolve(process.cwd(), 'public/data/generated/cities/sa.json'), 'utf8'),
    ) as CityRecord[];
    const page = searchCityRecords(records, 'Santa Cruz Costa Rica', 'en', 50);
    expect(page.results.some((city) => city.name === 'Santa Cruz' && city.countryCode === 'CR'))
      .toBe(true);
  });

  it('accepts the rendered administrative-area and country qualifier', async () => {
    const records = JSON.parse(
      await readFile(resolve(process.cwd(), 'public/data/generated/cities/at.json'), 'utf8'),
    ) as CityRecord[];
    for (const query of ['Atlanta GA', 'Atlanta, GA, United States']) {
      const page = searchCityRecords(records, query, 'en', 50);
      expect(
        page.results.some((city) =>
          city.name === 'Atlanta' && city.countryCode === 'US' && city.adminArea === 'GA'
        ),
      ).toBe(true);
    }
  });
});
