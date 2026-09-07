import { expect, test } from '@playwright/test';

import cityIndex from '../../public/data/generated/cities-index.json' with { type: 'json' };
import timeZoneRules from '../../src/data/generated/time-zone-rules.json' with { type: 'json' };
import { serializeEvent } from '../../src/domain/share-link';
import { createEventPayload, initializeTimeZoneRules } from '../../src/domain/temporal';

initializeTimeZoneRules(timeZoneRules);

test('reopens a shared event offline after the application is cached', async ({ page, context, browserName }) => {
  test.skip(
    browserName === 'webkit',
    'Playwright WebKit cannot perform offline top-level navigation reliably on Windows.',
  );
  const fragment = serializeEvent(
    createEventPayload('Offline rendezvous', '2026-12-10T18:45', 'Asia/Kathmandu'),
  );
  await page.goto(`./#${fragment}`);
  await expect(page.getByRole('heading', { name: 'Offline rendezvous' })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker?.controller);

  const eventUrl = page.url();
  await page.close();
  await context.setOffline(true);
  const offlinePage = await context.newPage();
  await offlinePage.goto(eventUrl, { waitUntil: 'domcontentloaded' });
  await expect(offlinePage.getByRole('heading', { name: 'Offline rendezvous' })).toBeVisible();
  await expect(offlinePage.getByText(/Asia\/Kathmandu/).first()).toBeVisible();
});

test('service-worker caches contain no event fragment data', async ({ page }) => {
  const fragment = serializeEvent(
    createEventPayload('Private planning session', '2026-12-10T18:45', 'UTC'),
  );
  await page.goto(`./#${fragment}`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker?.controller);
  const keys = await page.evaluate(async () =>
    (await Promise.all(
      (await caches.keys()).map(async (cacheName) =>
        (await (await caches.open(cacheName)).keys()).map((request) => request.url)
      ),
    )).flat()
  );
  expect(keys.some((key) => key.includes('Private') || key.includes('#'))).toBe(false);
  expect(keys.some((key) => key.includes('nominatim'))).toBe(false);
  expect(keys.filter((key) => key.includes('/data/generated/cities/'))).toHaveLength(
    Object.keys(cityIndex.shards).length,
  );
});
