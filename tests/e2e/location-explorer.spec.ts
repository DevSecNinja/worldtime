import { expect, test } from '@playwright/test';

import countries from '../../src/data/generated/countries.json' with { type: 'json' };
import timeZoneRules from '../../src/data/generated/time-zone-rules.json' with { type: 'json' };
import timeZones from '../../src/data/generated/timezones.json' with { type: 'json' };
import { serializeEvent } from '../../src/domain/share-link';
import { createEventPayload, initializeTimeZoneRules } from '../../src/domain/temporal';

initializeTimeZoneRules(timeZoneRules);
const eventFragment = serializeEvent(
  createEventPayload('Distributed review', '2026-09-08T09:30', 'Europe/Amsterdam'),
);

test('search and multi-zone country selection provide exact conversion', async ({ page }) => {
  await page.goto(`./#${eventFragment}`);
  await page.getByLabel('Country or city').fill('United Kingdom');
  await page.getByRole('button', { name: /United Kingdom.*GB/ }).click();
  await expect(page.getByText('Compared location')).toBeVisible();
  await page.getByLabel('Country or city').fill('United States');
  await page.getByRole('button', { name: /United States.*US/ }).click();
  await expect(page.getByText('Compared location')).toHaveCount(0);
  await expect(page.getByText('America/New_York')).toBeVisible();
  await page.getByRole('button', { name: 'America/New_York' }).click();
  await expect(page.getByText('Compared location')).toBeVisible();
  await expect(page.getByText(/America\/New_York/).first()).toBeVisible();
});

test('finds a city directly from the country-or-city field', async ({ page }) => {
  await page.goto(`./#${eventFragment}`);
  await page.getByLabel('Country or city').fill('Seattle');
  await page.getByRole('button', { name: /Seattle, United States.*America\/Los_Angeles/ }).click();
  await expect(page.getByText('Compared location')).toBeVisible();
  await expect(page.getByText(/America\/Los_Angeles/).first()).toBeVisible();
});

test('finds a city from the complete GeoNames catalog', async ({ page }) => {
  await page.goto(`./#${eventFragment}`);
  const picker = page.getByRole('combobox', { name: 'Search time zones' });
  await picker.fill('Vila');
  const city = page.getByRole('option', { name: /Vila, Andorra.*Europe\/Andorra/ });
  await expect(city).toBeVisible();
  await city.click();
  await expect(page.getByText(/Europe\/Andorra/).first()).toBeVisible();

  await picker.fill('Vla');
  await expect(
    page.getByRole('option', { name: /Vila, Andorra.*Europe\/Andorra/ }),
  ).toBeVisible();

  await picker.fill('Ærøskøbing');
  await expect(
    page.getByRole('option', { name: /Ærøskøbing, Denmark.*Europe\/Copenhagen/ }),
  ).toBeVisible();

  await picker.fill('Santa Cruz Costa Rica');
  await expect(
    page.getByRole('option', { name: /Santa Cruz, Costa Rica.*America\/Costa_Rica/ }),
  ).toBeVisible();

  await picker.fill('Santa Cruz');
  await expect(page.getByRole('button', { name: 'Show more matching cities' })).toBeVisible();
});

test('keeps search available when the optional globe cannot load', async ({ page, browserName }) => {
  test.skip(
    browserName === 'webkit',
    'Playwright WebKit does not route dynamic module requests reliably.',
  );
  await page.route('**/assets/GlobeExplorer-*.js', (route) => route.abort());
  await page.goto(`./#${eventFragment}`);
  await page.getByRole('button', { name: 'Open interactive globe' }).click();
  await expect(page.getByText(/globe could not load/i)).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Search time zones' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Distributed review' })).toBeVisible();
});

test('shows the same fallback when globe geometry cannot load', async ({ page, browserName }) => {
  test.skip(
    browserName === 'webkit',
    'Playwright WebKit does not route service-worker-controlled geometry requests.',
  );
  await page.route('**/data/generated/countries.geo.json', (route) => route.abort());
  await page.goto(`./#${eventFragment}`);
  await page.getByRole('button', { name: 'Open interactive globe' }).click();
  await expect(page.getByText(/globe could not load/i)).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Search time zones' })).toBeVisible();
});

test('browser catalog validates all countries, zones, and geometry mappings', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`./#${eventFragment}`);
  const audit = await page.evaluate(async () => {
    const [
      countryResponse,
      zoneResponse,
      rulesResponse,
      geometryResponse,
      cityIndex,
    ] = await Promise.all([
      fetch(new URL('data/generated/countries.json', document.baseURI)).then((response) =>
        response.json()
      ),
      fetch(new URL('data/generated/timezones.json', document.baseURI)).then((response) =>
        response.json()
      ),
      fetch(new URL('data/generated/time-zone-rules.json', document.baseURI)).then((response) =>
        response.json()
      ),
      fetch(new URL('data/generated/countries.geo.json', document.baseURI)).then((response) =>
        response.json()
      ),
      fetch(new URL('data/generated/cities-index.json', document.baseURI)).then((response) =>
        response.json()
      ),
    ]);
    const browserCountries = countryResponse;
    const browserZones = zoneResponse;
    const geometryCodes = new Set(
      geometryResponse.features.map((item: { properties: { alpha2: string; }; }) =>
        item.properties.alpha2
      ),
    );
    const zoneIds = new Set(browserZones.map((zone: { id: string; }) => zone.id));
    const countryCodes = new Set(
      browserCountries.map((country: { alpha2: string; }) => country.alpha2),
    );
    const cityShards = await Promise.all(
      Object.keys(cityIndex.shards).map((shard) =>
        fetch(new URL(`data/generated/cities/${shard}.json`, document.baseURI)).then(
          (response) => response.json(),
        )
      ),
    );
    const cities = cityShards.flat() as [
      number,
      string,
      string,
      string,
      string,
      number,
    ][];
    const uniqueCities = [...new Map(cities.map((city) => [city[0], city])).values()];
    return {
      countries: browserCountries.length,
      zones: browserZones.length,
      invalidZones: browserZones
        .filter((zone: { id: string; }) =>
          !Array.isArray(rulesResponse[zone.id]) || rulesResponse[zone.id].length === 0
        )
        .map((zone: { id: string; }) => zone.id),
      invalidCountryMappings: browserCountries
        .filter((country: { timeZones: string[]; requiresManualTimeZone: boolean; }) =>
          (!country.requiresManualTimeZone && country.timeZones.length === 0)
          || country.timeZones.some((zone) => !zoneIds.has(zone))
        )
        .map((country: { alpha2: string; }) => country.alpha2),
      missingGeometry: browserCountries
        .filter((country: { hasGeometry: boolean; alpha2: string; }) =>
          country.hasGeometry && !geometryCodes.has(country.alpha2)
        )
        .map((country: { alpha2: string; }) => country.alpha2),
      cities: uniqueCities.length,
      invalidCities: uniqueCities
        .filter((city) => !countryCodes.has(city[3]) || !zoneIds.has(city[4]) || !city[1])
        .slice(0, 20)
        .map((city) => city[0]),
    };
  });

  expect(audit.countries).toBe(countries.length);
  expect(audit.zones).toBe(timeZones.length);
  expect(audit.invalidZones).toEqual([]);
  expect(audit.invalidCountryMappings).toEqual([]);
  expect(audit.missingGeometry).toEqual([]);
  expect(audit.cities).toBe(235_684);
  expect(audit.invalidCities).toEqual([]);
});
