import Fuse from 'fuse.js';

import { TIME_ZONE_ALIASES } from '../data/aliases';
import countryData from '../data/generated/countries.json';
import timeZoneData from '../data/generated/timezones.json';
import type { CountryRecord, Locale, TimeZoneRecord } from './event';

export const TIME_ZONES = timeZoneData as TimeZoneRecord[];
export const COUNTRIES = countryData as CountryRecord[];

const normalize = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[_/]+/g, ' ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLocaleLowerCase('en');

interface SearchEntry extends TimeZoneRecord {
  aliases: readonly string[];
  normalizedId: string;
  normalizedAliases: string[];
}

const entries: SearchEntry[] = TIME_ZONES.map((zone) => ({
  ...zone,
  aliases: TIME_ZONE_ALIASES[zone.id] ?? [],
  normalizedId: normalize(zone.id),
  normalizedAliases: (TIME_ZONE_ALIASES[zone.id] ?? []).map(normalize),
}));

const fuse = new Fuse(entries, {
  threshold: 0.34,
  ignoreLocation: true,
  shouldSort: true,
  keys: [
    { name: 'normalizedAliases', weight: 0.42 },
    { name: 'normalizedId', weight: 0.30 },
    { name: 'cities', weight: 0.18 },
    { name: 'searchText', weight: 0.10 },
  ],
});

const timeZoneById = new Map(TIME_ZONES.map((zone) => [zone.id, zone]));
const countryByCode = new Map(COUNTRIES.map((country) => [country.alpha2, country]));

export function getTimeZone(id: string): TimeZoneRecord | undefined {
  return timeZoneById.get(id);
}

export function getCountry(code: string): CountryRecord | undefined {
  return countryByCode.get(code.toUpperCase());
}

export function searchTimeZones(query: string, limit = 8): TimeZoneRecord[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    const preferred = [
      'UTC',
      'Europe/Amsterdam',
      'Europe/London',
      'America/New_York',
      'America/Los_Angeles',
      'Asia/Tokyo',
      'Asia/Kolkata',
      'Australia/Sydney',
    ];
    return preferred.map((id) => timeZoneById.get(id)).filter(Boolean) as TimeZoneRecord[];
  }
  const directMatch = timeZoneById.get(query);
  if (directMatch) return [directMatch];

  const exact = entries
    .filter((entry) =>
      entry.normalizedId === normalizedQuery
      || entry.normalizedAliases.includes(normalizedQuery)
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const prefix = entries
    .filter((entry) =>
      entry.normalizedId.startsWith(normalizedQuery)
      || entry.normalizedAliases.some((alias) => alias.startsWith(normalizedQuery))
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  const fuzzy = fuse.search(normalizedQuery, { limit: limit * 3 }).map((result) => result.item);

  return [...new Map([...exact, ...prefix, ...fuzzy].map((entry) => [entry.id, entry])).values()]
    .slice(0, limit);
}

export function searchCountries(query: string, locale: Locale, limit = 8): CountryRecord[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return COUNTRIES.slice(0, limit);
  return COUNTRIES
    .map((country) => ({
      country,
      label: normalize(`${country.names[locale]} ${country.names.en} ${country.alpha2}`),
    }))
    .filter(({ label }) => label.includes(normalizedQuery))
    .sort((left, right) => {
      const leftStarts = left.label.startsWith(normalizedQuery) ? 0 : 1;
      const rightStarts = right.label.startsWith(normalizedQuery) ? 0 : 1;
      return leftStarts - rightStarts
        || left.country.names[locale].localeCompare(right.country.names[locale], locale);
    })
    .slice(0, limit)
    .map(({ country }) => country);
}

export function countryNamesForZone(zone: TimeZoneRecord, locale: Locale): string {
  return zone.countries
    .map((code) => countryByCode.get(code)?.names[locale] ?? code)
    .join(', ');
}
