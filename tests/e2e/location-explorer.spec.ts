import { expect, test } from '@playwright/test';

import cityIndex from '../../public/data/generated/cities-index.json' with { type: 'json' };
import countries from '../../src/data/generated/countries.json' with { type: 'json' };
import timeZoneRules from '../../src/data/generated/time-zone-rules.json' with { type: 'json' };
import timeZones from '../../src/data/generated/timezones.json' with { type: 'json' };
import { serializeEvent } from '../../src/domain/share-link';
import { createEventPayload, initializeTimeZoneRules } from '../../src/domain/temporal';

test.use({ serviceWorkers: 'block' });

initializeTimeZoneRules(timeZoneRules);
const eventFragment = serializeEvent(
  createEventPayload('Distributed review', '2026-09-08T09:30', 'Europe/Amsterdam'),
);

test('search and multi-zone country selection provide exact conversion', async ({ page }) => {
  await page.goto(`./#${eventFragment}`);
  const picker = page.getByRole('combobox', { name: 'Country, city, or time zone' });
  await picker.fill('United Kingdom');
  await page.getByRole('option', { name: /United Kingdom.*Europe\/London/ }).click();
  await expect(page.getByText('Compared location')).toBeVisible();
  await picker.fill('United States');
  await page.getByRole('option', { name: /United States.*Choose an exact time zone/ }).click();
  await expect(page.getByText('Compared location')).toHaveCount(0);
  await expect(page.getByText(/multiple time zones.*Add a city/i)).toBeVisible();
  await picker.fill('Atlanta U');
  await page.getByRole('option', { name: /Atlanta, GA, United States.*America\/New_York/ }).click();
  await expect(page.getByText('Compared location')).toBeVisible();
  await expect(page.getByText(/America\/New_York/).first()).toBeVisible();
});

test('finds a city directly from the country-or-city field', async ({ page }) => {
  const cityRequests: string[] = [];
  page.on('request', (request) => {
    if (
      request.url().includes('/data/generated/cities/')
      || request.url().includes('/data/generated/city-prefixes/')
    ) {
      cityRequests.push(request.url());
    }
  });
  await page.goto(`./#${eventFragment}`);
  await page.getByRole('combobox', { name: 'Country, city, or time zone' }).fill('Seattle');
  await page.getByRole('option', { name: /Seattle, WA, United States.*America\/Los_Angeles/ })
    .click();
  await expect(page.getByText('Compared location')).toBeVisible();
  await expect(page.getByText(/America\/Los_Angeles/).first()).toBeVisible();
  expect(cityRequests.some((url) => /\/cities\/se\.json/.test(url))).toBe(true);
  expect(cityRequests.some((url) => /\/cities\/s\.json/.test(url))).toBe(false);
  expect(cityRequests.some((url) => /\/city-prefixes\/s\.json/.test(url))).toBe(true);
});

test('understands partial country qualifiers and preserves the selected place label', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 840 });
  await page.goto(`./#${eventFragment}`);
  await page.getByLabel('Time format').selectOption('h12');
  const picker = page.getByRole('combobox', { name: 'Country, city, or time zone' });
  await picker.fill('Atlanta U');
  const atlanta = page.getByRole('option', {
    name: /Atlanta, GA, United States.*America\/New_York/,
  });
  await expect(atlanta).toBeVisible();
  await atlanta.click();
  await expect(picker).toHaveValue('Atlanta, GA, United States');
  await expect(page.getByText('Atlanta, GA, United States', { exact: true })).toBeVisible();
  const pickerBox = await picker.boundingBox();
  const resultBox = await page.getByText('Compared location').boundingBox();
  expect((resultBox?.y ?? 0) > (pickerBox?.y ?? 0)).toBe(true);
  expect(
    await page.locator('.comparison-result').evaluate((element) =>
      element.scrollWidth <= element.clientWidth
    ),
  ).toBe(true);
  await picker.fill('Atlanta GA');
  await expect(atlanta).toBeVisible();
  await picker.fill('Atlanta, GA, United States');
  await expect(atlanta).toBeVisible();
});

test('finds a city from the complete GeoNames catalog', async ({ page }) => {
  await page.goto(`./#${eventFragment}`);
  const picker = page.getByRole('combobox', { name: 'Country, city, or time zone' });
  await picker.fill('Vila');
  const city = page.getByRole('option', { name: /Vila, Andorra.*Europe\/Andorra/ });
  await expect(city).toBeVisible();
  await city.click();
  await expect(page.getByText(/Europe\/Andorra/).first()).toBeVisible();

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

test('browser catalog validates all countries, cities, and zones', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`./#${eventFragment}`);
  const audit = await page.evaluate(async () => {
    const [
      countryResponse,
      zoneResponse,
      rulesResponse,
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
      fetch(new URL('data/generated/cities-index.json', document.baseURI)).then((response) =>
        response.json()
      ),
    ]);
    const browserCountries = countryResponse;
    const browserZones = zoneResponse;
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
  expect(audit.cities).toBe(cityIndex.total);
  expect(audit.invalidCities).toEqual([]);
});
