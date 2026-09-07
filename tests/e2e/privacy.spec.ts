import { expect, test } from '@playwright/test';

test.use({
  geolocation: { latitude: 52.3676, longitude: 4.9041 },
  permissions: ['geolocation'],
});

test('coordinates remain local until separate country-lookup consent', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.route('https://nominatim.openstreetmap.org/**', async (route) => {
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
  await page.getByText('Use my location').click();
  await page.getByRole('button', { name: 'Enable location services' }).click();
  await expect(page.getByText(/Europe\/Amsterdam/).first()).toBeVisible();
  expect(requests.filter((url) => url.includes('nominatim'))).toHaveLength(0);

  await expect(page.getByText('Want a country name too?')).toBeVisible();
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

test('invalid-link details are localized in Dutch', async ({ page }) => {
  await page.goto('./#v=1&local=broken');
  await page.getByLabel('Language').selectOption('nl');
  await expect(page.getByRole('heading', { name: 'Deze evenementlink is niet geldig' }))
    .toBeVisible();
  await expect(page.getByText('De evenementlink is onvolledig.')).toBeVisible();
});
