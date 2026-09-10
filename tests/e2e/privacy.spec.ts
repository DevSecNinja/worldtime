import { expect, test } from '@playwright/test';

test.use({
  geolocation: { latitude: 52.3676, longitude: 4.9041 },
  permissions: ['geolocation'],
  serviceWorkers: 'block',
});

test('coordinates remain local until separate country-lookup consent', async ({ page, context }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await context.route('https://nominatim.openstreetmap.org/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        address: {
          country: 'Netherlands',
          country_code: 'nl',
          city: 'Amsterdam',
        },
      }),
    });
  });

  await page.goto('./');
  await page.getByRole('combobox', { name: 'Event time zone' }).click();
  await page.getByRole('option', { name: /Use my location/ }).click();
  await page.getByRole('button', { name: 'Enable location services' }).click();
  await expect(page.getByText(/Europe\/Amsterdam/).first()).toBeVisible();
  expect(requests.filter((url) => url.includes('nominatim'))).toHaveLength(0);

  await page.getByRole('button', { name: 'Europe/Amsterdam' }).click();
  await expect(page.getByText('Want a country name too?')).toBeVisible();
  await expect(page.getByText('Only after you agree, we ask OpenStreetMap')).toBeVisible();
  await page.getByText('What is shared?').click();
  await expect(page.getByText(/selected response language/)).toBeVisible();
  await expect(page.getByText(/Provider retention follows its privacy policy/)).toBeVisible();
  await expect(page.getByText(/manual search still works/)).toBeVisible();
  await page.getByRole('button', { name: /look up country/ }).click();
  await expect(page.getByText('Netherlands (NL)')).toBeVisible();
  expect(requests.filter((url) => url.includes('nominatim'))).toHaveLength(1);

  expect(
    await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      indexed: indexedDB.databases ? (await indexedDB.databases()).length : 0,
    })),
  ).toEqual({ local: 0, session: 0, indexed: 0 });
});

test('country lookup never overrides a different local time-zone candidate', async ({ page, context }) => {
  await context.setGeolocation({ latitude: 47.6062, longitude: -122.3321 });
  await context.route('https://nominatim.openstreetmap.org/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        address: {
          country: 'Netherlands',
          country_code: 'nl',
        },
      }),
    });
  });
  await page.goto('./');
  await page.getByRole('combobox', { name: 'Event time zone' }).click();
  await page.getByRole('option', { name: /Use my location/ }).click();
  await page.getByRole('button', { name: 'Enable location services' }).click();
  await expect(page.getByText('America/Los_Angeles')).toBeVisible();
  await page.getByRole('button', { name: 'America/Los_Angeles' }).click();
  await page.getByRole('button', { name: /look up country/ }).click();
  await expect(page.getByText('Netherlands (NL)')).toBeVisible();
  await expect(page.getByText('America/Los_Angeles')).toBeVisible();
});

test('country lookup uses action-specific loading and failure messages', async ({ page, context }) => {
  let releaseLookup!: () => void;
  const lookupGate = new Promise<void>((resolve) => {
    releaseLookup = resolve;
  });
  let lookupRequests = 0;
  await context.route('https://nominatim.openstreetmap.org/**', async (route) => {
    lookupRequests += 1;
    await lookupGate;
    await route.fulfill({ status: 503, body: 'Unavailable' });
  });
  await page.goto('./');
  await page.getByRole('combobox', { name: 'Event time zone' }).click();
  await page.getByRole('option', { name: /Use my location/ }).click();
  await page.getByRole('button', { name: 'Enable location services' }).click();
  await page.getByRole('button', { name: 'Europe/Amsterdam' }).click();
  await page.getByRole('button', { name: /look up country/ }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(page.getByRole('button', { name: 'Looking up the country…' })).toBeDisabled();
  await expect.poll(() => lookupRequests).toBe(1);
  releaseLookup();
  await expect(page.getByText('The country lookup failed. Time-zone search still works.'))
    .toBeVisible();
});

test('country lookup can be declined without losing the selected time zone', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('combobox', { name: 'Event time zone' }).click();
  await page.getByRole('option', { name: /Use my location/ }).click();
  await page.getByRole('button', { name: 'Enable location services' }).click();
  await page.getByRole('button', { name: 'Europe/Amsterdam' }).click();
  await page.getByRole('button', { name: 'No thanks' }).click();
  await expect(page.getByText('Want a country name too?')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Event time zone' })).toHaveValue(
    'Europe/Amsterdam',
  );
});

test('Dutch and theme choices reset after a refresh', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Language').selectOption('nl');
  await expect(page.getByRole('heading', { name: /Stel de tijd/ })).toBeVisible();
  await page.getByLabel('Thema').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByLabel('Theme')).toHaveValue('system');
});

test('theme control remains available on narrow mobile layouts', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto('./');
  await expect(page.getByLabel('Theme')).toBeVisible();
});

test('dark theme keeps header selector options dark and readable', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Theme').selectOption('dark');
  const styles = await page.getByLabel('Theme').locator('option:checked').evaluate((option) => {
    const style = getComputedStyle(option);
    return { color: style.color, background: style.backgroundColor };
  });
  expect(styles.color).toBe('rgb(255, 255, 255)');
  expect(styles.background).toBe('rgb(40, 67, 111)');
});

test('invalid-link details are localized in Dutch', async ({ page }) => {
  await page.goto('./#v=1&local=broken');
  await page.getByLabel('Language').selectOption('nl');
  await expect(page.getByRole('heading', { name: 'Deze evenementlink is niet geldig' }))
    .toBeVisible();
  await expect(page.getByText('404 · Tijdafwijking')).toBeVisible();
  await expect(page.getByText('De evenementlink is onvolledig.')).toBeVisible();
});
