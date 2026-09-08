import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { rawTimeZones } from '@vvo/tzdb';
import enLocaleNames from 'cldr-localenames-full/main/en/territories.json' with { type: 'json' };
import nlLocaleNames from 'cldr-localenames-full/main/nl/territories.json' with { type: 'json' };
import { strFromU8, unzipSync } from 'fflate';
import countries from 'i18n-iso-countries';
import moment from 'moment-timezone';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-50m.json' with { type: 'json' };

const root = resolve(import.meta.dirname, '..');
const upstreamManifestPath = resolve(root, 'data/upstream/manifest.json');
const zoneTabPath = resolve(root, 'data/upstream/iana/2026c/zone.tab');
const countryTabPath = resolve(root, 'data/upstream/iana/2026c/iso3166.tab');
const outputDir = resolve(root, 'src/data/generated');
const publicOutputDir = resolve(root, 'public/data/generated');

const normalize = (value) =>
  value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[_/]+/g, ' ')
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .toLocaleLowerCase('en');

const cityShardKey = (value) => {
  const compact = normalize(value).replace(/[^a-z0-9]/g, '');
  return compact.length >= 2 ? compact.slice(0, 2) : `${compact || 'x'}_`;
};

const readRows = async (path) =>
  (await readFile(path, 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('\t'));

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const writeJson = async (path, value) => {
  const content = `${JSON.stringify(value)}\n`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
  return {
    path: path.slice(root.length + 1).replaceAll('\\', '/'),
    records: Array.isArray(value) ? value.length : 1,
    sha256: sha256(content),
  };
};

const manifestSource = await readFile(upstreamManifestPath, 'utf8');
const upstreamManifest = JSON.parse(manifestSource);
const citySource = upstreamManifest.sources.find(({ name }) => name === 'GeoNames Gazetteer');
if (!citySource?.archive?.sha256) {
  throw new Error('GeoNames archive metadata is missing from the upstream manifest.');
}
const cityArchivePath = process.env.GEONAMES_ARCHIVE
  ? resolve(process.env.GEONAMES_ARCHIVE)
  : resolve(root, '.cache/reference-data/cities500.zip');

const [zoneRows, countryRows, citiesZip] = await Promise.all([
  readRows(zoneTabPath),
  readRows(countryTabPath),
  readFile(cityArchivePath),
]);
if (sha256(citiesZip) !== citySource.archive.sha256) {
  throw new Error('GeoNames archive checksum does not match the upstream manifest.');
}

const countryEnglishNames = new Map(countryRows.map(([code, name]) => [code, name]));
countryEnglishNames.set('XK', 'Kosovo');
const englishTerritories = enLocaleNames.main.en.localeDisplayNames.territories;
const dutchTerritories = nlLocaleNames.main.nl.localeDisplayNames.territories;

const metadataByZone = new Map();
for (const metadata of rawTimeZones) {
  for (const zone of metadata.group) {
    metadataByZone.set(zone, metadata);
  }
}

const countryZones = new Map();
const timeZones = zoneRows.map(([countryList, coordinates, id, comment = '']) => {
  const countryCodes = countryList.split(',');
  for (const code of countryCodes) {
    const zones = countryZones.get(code) ?? [];
    zones.push(id);
    countryZones.set(code, zones);
  }

  const metadata = metadataByZone.get(id);
  const isPrimaryMetadataZone = metadata?.name === id;
  const identifierCities = id.split('/').slice(1).map((part) => part.replaceAll('_', ' '));
  const cities = [
    ...new Set([...(isPrimaryMetadataZone ? metadata.mainCities : []), ...identifierCities]),
  ].sort();
  const tokens = [
    id,
    metadata?.alternativeName ?? '',
    comment,
    ...cities,
    ...countryCodes.flatMap((code) => [
      countryEnglishNames.get(code) ?? '',
      englishTerritories[code] ?? '',
      dutchTerritories[code] ?? '',
    ]),
  ].filter(Boolean);

  return {
    id,
    countries: countryCodes,
    coordinates,
    comment,
    cities,
    alternativeName: metadata?.alternativeName ?? '',
    searchText: normalize(tokens.join(' ')),
  };
});
timeZones.push({
  id: 'UTC',
  countries: [],
  coordinates: '+0000+00000',
  comment: 'Coordinated Universal Time',
  cities: ['UTC'],
  alternativeName: 'Coordinated Universal Time',
  searchText: 'utc coordinated universal time greenwich',
});
const supportedZoneIds = new Set(timeZones.map(({ id }) => id));
const canonicalZoneByAlias = new Map();
for (const metadata of rawTimeZones) {
  const canonical = metadata.group.find((zone) => supportedZoneIds.has(zone));
  if (!canonical) continue;
  for (const alias of metadata.group) canonicalZoneByAlias.set(alias, canonical);
}

const citiesArchive = unzipSync(citiesZip);
const citiesText = strFromU8(citiesArchive['cities500.txt']);
const cityShards = new Map();
const cityPrefixIndex = new Map();
const cityCountsByCountry = new Map();
let unsupportedCityCount = 0;
let cityRecordCount = 0;

for (const row of citiesText.split(/\r?\n/)) {
  if (!row) continue;
  const columns = row.split('\t');
  const [id, name, asciiName] = columns;
  const countryCode = columns[8];
  const population = Number(columns[14]) || 0;
  const sourceTimeZone = columns[17];
  const timeZone = supportedZoneIds.has(sourceTimeZone)
    ? sourceTimeZone
    : canonicalZoneByAlias.get(sourceTimeZone);
  if (!id || !name || !countryCode || !timeZone) {
    unsupportedCityCount += 1;
    continue;
  }
  cityRecordCount += 1;

  const searchTokens = [...new Set([normalize(name), normalize(asciiName || name)])].filter(Boolean);
  const bucket = cityShardKey(asciiName || name);
  const record = [
    Number(id),
    name,
    asciiName || name,
    countryCode,
    timeZone,
    population,
    searchTokens,
  ];
  const shard = cityShards.get(bucket) ?? [];
  shard.push(record);
  cityShards.set(bucket, shard);
  for (const searchToken of searchTokens) {
    const prefix = [...searchToken].slice(0, 4).join('');
    const buckets = cityPrefixIndex.get(prefix) ?? new Set();
    buckets.add(bucket);
    cityPrefixIndex.set(prefix, buckets);
  }
  cityCountsByCountry.set(countryCode, (cityCountsByCountry.get(countryCode) ?? 0) + 1);
}

for (const shard of cityShards.values()) {
  shard.sort((left, right) =>
    left[6][0].localeCompare(right[6][0])
    || right[5] - left[5]
    || left[0] - right[0]
  );
}

const geometryCollection = feature(world, world.objects.countries);
const geometryByCountry = new Map();
const excludedGeometry = [];

for (const item of geometryCollection.features) {
  const alpha2 = item.properties?.name === 'Kosovo'
    ? 'XK'
    : countries.numericToAlpha2(String(item.id).padStart(3, '0'));
  if (!alpha2) {
    excludedGeometry.push({
      id: String(item.id),
      name: item.properties?.name ?? 'Unknown',
      reason: 'Natural Earth geometry has no ISO 3166 numeric mapping',
    });
    continue;
  }

  geometryByCountry.set(alpha2, {
    ...item,
    id: alpha2,
    properties: {
      alpha2,
      name: item.properties?.name ?? countryEnglishNames.get(alpha2) ?? alpha2,
    },
  });
}

const countryCatalog = [...countryEnglishNames.entries()]
  .map(([alpha2, ianaName]) => {
    const numeric = countries.alpha2ToNumeric(alpha2);
    const mappedTimeZones = [...(countryZones.get(alpha2) ?? [])].sort();
    return {
      alpha2,
      numeric: alpha2 === 'XK' ? null : numeric ? String(numeric).padStart(3, '0') : null,
      names: {
        en: englishTerritories[alpha2] ?? ianaName,
        nl: dutchTerritories[alpha2] ?? ianaName,
      },
      timeZones: mappedTimeZones.length > 0
        ? mappedTimeZones
        : alpha2 === 'XK'
        ? ['Europe/Belgrade']
        : [],
      requiresManualTimeZone: mappedTimeZones.length === 0 && alpha2 !== 'XK',
      cityCount: cityCountsByCountry.get(alpha2) ?? 0,
      hasGeometry: geometryByCountry.has(alpha2),
    };
  })
  .sort((left, right) => left.alpha2.localeCompare(right.alpha2));

const rangeStart = Date.UTC(1968, 0, 1);
const rangeEnd = Date.UTC(2102, 0, 1);
const timeZoneRules = Object.fromEntries(
  timeZones.map((timeZone) => {
    const zone = moment.tz.zone(timeZone.id);
    if (!zone) throw new Error(`moment-timezone ${moment.tz.dataVersion} lacks ${timeZone.id}`);
    let segmentStart = Number.NEGATIVE_INFINITY;
    const segments = zone.untils
      .map((until, index) => {
        const boundedUntil = Number.isFinite(until) ? until : Number.POSITIVE_INFINITY;
        const segment = {
          until: Math.min(boundedUntil, rangeEnd),
          offsetMinutesWest: zone.offsets[index],
        };
        const inRange = boundedUntil >= rangeStart && segmentStart <= rangeEnd;
        segmentStart = boundedUntil;
        return inRange ? segment : null;
      })
      .filter(Boolean);
    return [timeZone.id, segments];
  }),
);

const artifacts = [];
artifacts.push(await writeJson(resolve(outputDir, 'timezones.json'), timeZones));
artifacts.push(await writeJson(resolve(outputDir, 'countries.json'), countryCatalog));
artifacts.push(await writeJson(resolve(publicOutputDir, 'timezones.json'), timeZones));
artifacts.push(await writeJson(resolve(publicOutputDir, 'countries.json'), countryCatalog));
artifacts.push(await writeJson(resolve(outputDir, 'time-zone-rules.json'), timeZoneRules));
artifacts.push(await writeJson(resolve(publicOutputDir, 'time-zone-rules.json'), timeZoneRules));
artifacts.push(
  await writeJson(resolve(publicOutputDir, 'countries.geo.json'), {
    type: 'FeatureCollection',
    features: [...geometryByCountry.values()],
  }),
);
const cityOutputDir = resolve(publicOutputDir, 'cities');
await rm(cityOutputDir, { recursive: true, force: true });
const cityIndex = {};
for (const [bucket, records] of [...cityShards.entries()].sort()) {
  const artifact = await writeJson(resolve(cityOutputDir, `${bucket}.json`), records);
  artifacts.push(artifact);
  cityIndex[bucket] = records.length;
}
await rm(resolve(publicOutputDir, 'city-prefixes.json'), { force: true });
const cityPrefixOutputDir = resolve(publicOutputDir, 'city-prefixes');
await rm(cityPrefixOutputDir, { recursive: true, force: true });
const cityPrefixGroups = new Map();
for (const [prefix, buckets] of cityPrefixIndex.entries()) {
  const group = /^[a-z0-9]/.test(prefix) ? prefix[0] : '_';
  const entries = cityPrefixGroups.get(group) ?? [];
  entries.push([prefix, [...buckets].sort()]);
  cityPrefixGroups.set(group, entries);
}
const prefixGroupIndex = {};
for (const [group, entries] of [...cityPrefixGroups.entries()].sort()) {
  entries.sort(([left], [right]) => left.localeCompare(right));
  const artifact = await writeJson(resolve(cityPrefixOutputDir, `${group}.json`), entries);
  artifacts.push(artifact);
  prefixGroupIndex[group] = entries.length;
}
artifacts.push(
  await writeJson(resolve(publicOutputDir, 'cities-index.json'), {
    schemaVersion: 1,
    source: 'GeoNames cities500',
    total: cityRecordCount,
    indexedEntries: [...cityShards.values()].reduce((sum, records) => sum + records.length, 0),
    unsupported: unsupportedCityCount,
    prefixEntries: cityPrefixIndex.size,
    prefixGroups: prefixGroupIndex,
    shards: cityIndex,
  }),
);

const provenance = {
  schemaVersion: 1,
  generatedAt: `${upstreamManifest.retrievedAt}T00:00:00.000Z`,
  sources: upstreamManifest.sources,
  transformations: [
    'Parsed all non-comment records from IANA tzdb 2026c zone.tab and iso3166.tab.',
    'Enriched search metadata from @vvo/tzdb without using its offset values.',
    `Compiled ${moment.tz.dataVersion} offset transitions surrounding the supported 1970-2100 wall-time range.`,
    'Localized ISO country codes from pinned CLDR 48.2 English and Dutch territory data.',
    'Normalized GeoNames cities500 records into two-character ASCII shards with a native-name prefix index.',
    'Converted Natural Earth-derived world-atlas TopoJSON to ISO-keyed GeoJSON.',
  ],
  counts: {
    timeZones: timeZones.length,
    countries: countryCatalog.length,
    countriesWithGeometry: geometryByCountry.size,
    excludedGeometry: excludedGeometry.length,
    ruleSets: Object.keys(timeZoneRules).length,
    cities: cityRecordCount,
    unsupportedCities: unsupportedCityCount,
  },
  excludedGeometry,
  artifacts,
};

await writeJson(resolve(outputDir, 'provenance.json'), provenance);
await writeJson(resolve(publicOutputDir, 'provenance.json'), provenance);

console.log(
  `Generated ${timeZones.length} IANA zones and ${countryCatalog.length} countries `
    + `(${geometryByCountry.size} with globe geometry).`,
);
