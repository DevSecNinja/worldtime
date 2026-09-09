import type { CityRecord, Locale } from './event';
import { CITY_CACHE_NAME } from './reference-data';
import { getCountry } from './timezone-search';

type CityPrefixEntry = [prefix: string, shards: string[]];

const shardCache = new Map<string, Promise<CityRecord[]>>();
const prefixIndexCache = new Map<string, Promise<CityPrefixEntry[]>>();

const cacheCityAsset = async (url: URL, response: Response) => {
  if (!('caches' in globalThis)) return;
  try {
    const cache = await caches.open(CITY_CACHE_NAME);
    await cache.put(url, response);
  } catch (error) {
    console.warn('Unable to cache public city search data for offline use.', error);
  }
};

export interface CitySearchResult {
  id: number;
  name: string;
  countryCode: string;
  countryName: string;
  timeZone: string;
  population: number;
  adminArea: string;
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

export function cityShardForAsciiName(asciiName: string): string | null {
  const compact = normalizePlaceName(asciiName).replace(/[^a-z0-9]/g, '');
  if (!compact) return null;
  return compact.length >= 2 ? compact.slice(0, 2) : `${compact}_`;
}

export function cityPrefixGroup(query: string): string | null {
  const normalized = normalizePlaceName(query);
  if (normalized.length < 2) return null;
  return /^[a-z0-9]/.test(normalized) ? normalized[0] : '_';
}

export function cityShardCandidates(
  prefixEntries: CityPrefixEntry[],
  query: string,
): string[] {
  const normalized = normalizePlaceName(query);
  if (normalized.length < 2) return [];
  const queryPrefix = [...normalized].slice(0, 4).join('');
  const directShards = new Set<string>();
  for (const [prefix, candidates] of prefixEntries) {
    const direct = prefix.startsWith(queryPrefix) || queryPrefix.startsWith(prefix);
    if (direct) { for (const shard of candidates) directShards.add(shard); }
  }
  return [...directShards].sort();
}

const matchRank = (record: CityRecord, query: string, locale: Locale): number | null => {
  const country = getCountry(record[3]);
  const countryTerms = [
    record[3],
    country?.names.en ?? '',
    country?.names.nl ?? '',
    country?.names[locale] ?? '',
  ].map(normalizePlaceName);
  const adminTerm = normalizePlaceName(record[7]);
  const qualifierTerms = [
    adminTerm,
    ...countryTerms,
    ...countryTerms.map((countryTerm) => `${adminTerm} ${countryTerm}`.trim()),
  ];

  for (const token of record[6]) {
    if (token === query) return 0;
    if (query.startsWith(`${token} `)) {
      const qualifier = query.slice(token.length + 1);
      if (qualifierTerms.some((term) => term.startsWith(qualifier))) return 0;
    }
    if (token.startsWith(query)) return 1;
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
  const ordered = [...exact, ...prefix];

  return {
    total: ordered.length,
    results: ordered.slice(0, limit).map(({ record }) => ({
      id: record[0],
      name: record[1],
      countryCode: record[3],
      countryName: getCountry(record[3])?.names[locale] ?? record[3],
      timeZone: record[4],
      population: record[5],
      adminArea: record[7],
    })),
  };
}

const loadPrefixIndex = (group: string) => {
  let request = prefixIndexCache.get(group);
  if (request) return request;
  const url = new URL(`data/generated/city-prefixes/${group}.json`, document.baseURI);
  request = fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error(`City prefix request failed: ${response.status}`);
      await cacheCityAsset(url, response.clone());
      return response.json() as Promise<CityPrefixEntry[]>;
    })
    .catch((error) => {
      prefixIndexCache.delete(group);
      throw error;
    });
  prefixIndexCache.set(group, request);
  return request;
};

const loadShard = (shard: string) => {
  let request = shardCache.get(shard);
  if (!request) {
    const url = new URL(`data/generated/cities/${shard}.json`, document.baseURI);
    request = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(`City index request failed: ${response.status}`);
        await cacheCityAsset(url, response.clone());
        return response.json() as Promise<CityRecord[]>;
      })
      .catch((error) => {
        shardCache.delete(shard);
        throw error;
      });
    shardCache.set(shard, request);
  }
  return request;
};

export async function searchCities(
  query: string,
  locale: Locale,
  limit = 12,
): Promise<CitySearchPage> {
  const group = cityPrefixGroup(query);
  if (!group) return { results: [], total: 0 };
  const shards = cityShardCandidates(await loadPrefixIndex(group), query);
  const records = (await Promise.all(shards.map(loadShard))).flat();
  return searchCityRecords(records, query, locale, limit);
}
