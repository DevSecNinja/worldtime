import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { cityShardFor, searchCityRecords } from '../../src/domain/city-search';
import type { CityRecord } from '../../src/domain/event';

describe('city search', () => {
  it('routes city queries to deterministic shards', () => {
    expect(cityShardFor('Amsterdam')).toBe('a');
    expect(cityShardFor('Ålesund')).toBe('a');
    expect(cityShardFor('東京')).toBe('_');
    expect(cityShardFor('a')).toBe('a');
  });

  it('finds Amsterdam and returns its exact IANA zone', async () => {
    const records = JSON.parse(
      await readFile(resolve(process.cwd(), 'public/data/generated/cities/a.json'), 'utf8'),
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
      await readFile(resolve(process.cwd(), 'public/data/generated/cities/_.json'), 'utf8'),
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
      await readFile(resolve(process.cwd(), 'public/data/generated/cities/s.json'), 'utf8'),
    ) as CityRecord[];
    const page = searchCityRecords(records, 'Santa Cruz Costa Rica', 'en', 50);
    expect(page.results.some((city) => city.name === 'Santa Cruz' && city.countryCode === 'CR'))
      .toBe(true);
  });

  it('tolerates a single-character city-name typo', async () => {
    const records = JSON.parse(
      await readFile(resolve(process.cwd(), 'public/data/generated/cities/v.json'), 'utf8'),
    ) as CityRecord[];
    const page = searchCityRecords(records, 'Vla', 'en');
    expect(
      page.results.some((city) => city.name === 'Vila' && city.timeZone === 'Europe/Andorra'),
    ).toBe(true);
  });
});
