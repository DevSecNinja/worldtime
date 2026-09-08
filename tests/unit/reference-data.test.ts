import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import referenceData from '../../reference-data.json';
import countries from '../../src/data/generated/countries.json';
import provenance from '../../src/data/generated/provenance.json';
import timeZones from '../../src/data/generated/timezones.json';
import { cityMatchesQuery, cityShardForAsciiName } from '../../src/domain/city-search';
import type { CityRecord } from '../../src/domain/event';

describe('generated reference data', () => {
  it('contains the complete pinned IANA and ISO catalogs', () => {
    expect(timeZones).toHaveLength(419);
    expect(countries).toHaveLength(250);
    expect(new Set(timeZones.map((zone) => zone.id)).size).toBe(timeZones.length);
    expect(new Set(countries.map((country) => country.alpha2)).size).toBe(countries.length);
  });

  it('maps every country to one or more supported zones', () => {
    const supported = new Set(timeZones.map((zone) => zone.id));
    for (const country of countries) {
      expect(country.names.en, country.alpha2).toBeTruthy();
      expect(country.names.nl, country.alpha2).toBeTruthy();
      expect(
        country.timeZones.length > 0 || country.requiresManualTimeZone,
        country.alpha2,
      ).toBe(true);
      for (const zone of country.timeZones) {
        expect(supported.has(zone), `${country.alpha2} -> ${zone}`).toBe(true);
      }
    }
  });

  it('accepts every time zone in the runtime rule engine', () => {
    for (const zone of timeZones) {
      expect(
        () => new Intl.DateTimeFormat('en', { timeZone: zone.id }).format(0),
        zone.id,
      ).not.toThrow();
    }
  });

  it('retains verifiable source hashes and output counts', async () => {
    const ianaSource = provenance.sources.find((source) =>
      source.name === 'IANA Time Zone Database'
    );
    expect(ianaSource?.version).toBe('2026c');
    expect(
      provenance.sources.find((source) => source.name === 'Natural Earth')?.version,
    ).toBe('4.1.0');
    for (const source of provenance.sources) {
      for (const file of source.files ?? []) {
        const content = await readFile(resolve(process.cwd(), file.path));
        expect(createHash('sha256').update(content).digest('hex')).toBe(file.sha256);
      }
    }
    expect(provenance.counts.timeZones).toBe(timeZones.length);
    expect(provenance.counts.countries).toBe(countries.length);
    expect(referenceData.cityCount).toBe(provenance.counts.cities);
    expect(referenceData.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(referenceData.releaseTag).toMatch(/^data-\d{4}-\d{2}-\d{2}/);
  });

  it('maps every GeoNames city to a known country and time zone', async () => {
    const cityDirectory = resolve(process.cwd(), 'public/data/generated/cities');
    const files = await readdir(cityDirectory);
    const countryCodes = new Set(countries.map((country) => country.alpha2));
    const zoneIds = new Set(timeZones.map((zone) => zone.id));
    const cityIds = new Set<number>();
    const invalid: string[] = [];
    const prefixDirectory = resolve(process.cwd(), 'public/data/generated/city-prefixes');
    const prefixFiles = await readdir(prefixDirectory);
    const prefixEntries = (
      await Promise.all(
        prefixFiles.map(async (file) =>
          JSON.parse(await readFile(resolve(prefixDirectory, file), 'utf8')) as [
            string,
            string[],
          ][]
        ),
      )
    ).flat();
    const prefixMap = new Map(prefixEntries);

    for (const file of files) {
      const records = JSON.parse(
        await readFile(resolve(cityDirectory, file), 'utf8'),
      ) as CityRecord[];
      const bucket = file.replace('.json', '');
      for (const record of records) {
        cityIds.add(record[0]);
        if (!record[1]) invalid.push(`${record[0]} has no name`);
        if (!countryCodes.has(record[3])) invalid.push(`${record[1]} -> country ${record[3]}`);
        if (!zoneIds.has(record[4])) invalid.push(`${record[1]} -> zone ${record[4]}`);
        if (!cityMatchesQuery(record, record[1], 'en')) {
          invalid.push(`${record[1]} cannot be found by its displayed name`);
        }
        if (cityShardForAsciiName(record[2]) !== bucket) {
          invalid.push(`${record[1]} is stored in incorrect shard ${bucket}`);
        }
        for (const token of record[6]) {
          const prefix = [...token].slice(0, 4).join('');
          if (!prefixMap.get(prefix)?.includes(bucket)) {
            invalid.push(`${record[1]} token ${token} cannot route to ${bucket}`);
          }
        }
      }
    }

    expect(invalid).toEqual([]);
    expect(provenance.counts.cities).toBe(cityIds.size);
    expect(provenance.counts.unsupportedCities).toBe(0);
  });
});
