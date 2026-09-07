import type { CityRecord, Locale } from './event';
import { getCountry } from './timezone-search';

const shardCache = new Map<string, Promise<CityRecord[]>>();

export interface CitySearchResult {
  id: number;
  name: string;
  countryCode: string;
  countryName: string;
  timeZone: string;
  population: number;
}

export interface CitySearchPage {
  results: CitySearchResult[];
  total: number;
}

export const normalizePlaceName = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLocaleLowerCase('en');

export function cityShardFor(query: string): string | null {
  const normalized = normalizePlaceName(query);
  if (!normalized) return null;
  return /^[a-z0-9]/.test(normalized) ? normalized[0] : '_';
}

const editDistanceAtMostOne = (left: string, right: string): boolean => {
  if (Math.abs(left.length - right.length) > 1) return false;
  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  if (leftIndex < left.length || rightIndex < right.length) edits += 1;
  return edits <= 1;
};

const isFuzzyPrefix = (token: string, query: string): boolean => {
  if (query.length < 3) return false;
  const lengths = token.length < query.length
    ? [token.length]
    : [query.length, Math.min(token.length, query.length + 1)];
  return [...new Set(lengths)]
    .some((length) => editDistanceAtMostOne(token.slice(0, length), query));
};

const matchRank = (record: CityRecord, query: string, locale: Locale): number | null => {
  const country = getCountry(record[3]);
  const countryTerms = [
    record[3],
    country?.names.en ?? '',
    country?.names.nl ?? '',
    country?.names[locale] ?? '',
  ].map(normalizePlaceName);

  for (const token of record[6]) {
    if (token === query) return 0;
    if (query.startsWith(`${token} `)) {
      const qualifier = query.slice(token.length + 1);
      if (countryTerms.some((term) => term.startsWith(qualifier))) return 0;
    }
    if (token.startsWith(query)) return 1;
    if (isFuzzyPrefix(token, query)) return 2 + Math.min(token.length, 999) / 1_000;
  }
  return null;
};

export function cityMatchesQuery(
  record: CityRecord,
  query: string,
  locale: Locale,
): boolean {
  const normalizedQuery = normalizePlaceName(query);
  return Boolean(normalizedQuery) && matchRank(record, normalizedQuery, locale) !== null;
}

export function searchCityRecords(
  records: CityRecord[],
  query: string,
  locale: Locale,
  limit = 12,
): CitySearchPage {
  const normalizedQuery = normalizePlaceName(query);
  if (!normalizedQuery) return { results: [], total: 0 };
  const matches = records
    .map((record) => ({ record, rank: matchRank(record, normalizedQuery, locale) }))
    .filter((candidate): candidate is { record: CityRecord; rank: number; } =>
      candidate.rank !== null
    )
    .sort((left, right) =>
      left.rank - right.rank
      || right.record[5] - left.record[5]
      || left.record[1].localeCompare(right.record[1])
      || left.record[0] - right.record[0]
    );
  const unique = [...new Map(matches.map(({ record, rank }) => [record[0], { record, rank }]))
    .values()];
  const exact = unique.filter(({ rank }) => rank === 0);
  const prefix = unique.filter(({ rank }) => rank === 1);
  const fuzzy = unique.filter(({ rank }) => rank >= 2);
  const ordered = [
    ...exact,
    ...prefix.slice(0, 4),
    ...fuzzy.slice(0, 8),
    ...prefix.slice(4),
    ...fuzzy.slice(8),
  ];

  return {
    total: ordered.length,
    results: ordered.slice(0, limit).map(({ record }) => ({
      id: record[0],
      name: record[1],
      countryCode: record[3],
      countryName: getCountry(record[3])?.names[locale] ?? record[3],
      timeZone: record[4],
      population: record[5],
    })),
  };
}

export async function searchCities(
  query: string,
  locale: Locale,
  limit = 12,
): Promise<CitySearchPage> {
  const shard = cityShardFor(query);
  if (!shard) return { results: [], total: 0 };
  let request = shardCache.get(shard);
  if (!request) {
    request = fetch(new URL(`data/generated/cities/${shard}.json`, document.baseURI))
      .then((response) => {
        if (!response.ok) throw new Error(`City index request failed: ${response.status}`);
        return response.json() as Promise<CityRecord[]>;
      });
    shardCache.set(shard, request);
  }
  return searchCityRecords(await request, query, locale, limit);
}
