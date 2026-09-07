import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import timeZoneRules from '../../src/data/generated/time-zone-rules.json' with { type: 'json' };
import timeZones from '../../src/data/generated/timezones.json' with { type: 'json' };
import { serializeEvent } from '../../src/domain/share-link';
import { createEventPayload, initializeTimeZoneRules } from '../../src/domain/temporal';

initializeTimeZoneRules(timeZoneRules);

test('creates and opens an Amsterdam event', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Event name').fill('Launch');
  await page.getByLabel('Date').fill('2026-09-08');
  await page.locator('#event-time').fill('09:30');
  await page.getByRole('combobox', { name: 'Event time zone' }).fill('ams');
  await expect(page.getByRole('option', { name: /Europe\/Amsterdam/ }).first()).toBeVisible();
  await page.getByRole('option', { name: /Europe\/Amsterdam/ }).first().click();
  await page.getByRole('button', { name: /Copy link/ }).click();
  const shareOutput = page.getByLabel('Copy link');
  await expect(shareOutput).toBeVisible();
  const shareUrl = await shareOutput.inputValue();

  expect(shareUrl).toContain('#v=1&name=Launch');
  await page.goto(shareUrl);
  await expect(page.getByRole('heading', { name: 'Launch' })).toBeVisible();
  await expect(page.getByText('Creator time')).toBeVisible();
  await expect(page.getByText(/Europe\/Amsterdam/).first()).toBeVisible();
});

test('opens the native OS share sheet with localized event details', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        (window as typeof window & { __sharedData?: ShareData; }).__sharedData = data;
      },
    });
  });
  await page.goto('./');
  await page.getByLabel('Event name').fill('Launch');
  await page.getByRole('combobox', { name: 'Event time zone' }).fill('ams');
  await page.getByRole('option', { name: /Europe\/Amsterdam/ }).first().click();
  await page.getByRole('button', { name: 'Share event' }).click();

  const shareData = await page.evaluate(
    () => (window as typeof window & { __sharedData?: ShareData; }).__sharedData,
  );
  expect(shareData?.title).toBe('Launch');
  expect(shareData?.text).toContain('Europe/Amsterdam');
  expect(shareData?.text).toContain('Open Worldtime');
  expect(shareData?.url).toContain('#v=1&name=Launch');
});

test('renders every supported zone link in a real browser', async ({ page, browserName }) => {
  test.setTimeout(120_000);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /Set the time once/ })).toBeVisible();
  const fragments = timeZones.map((zone) =>
    serializeEvent(createEventPayload(zone.id, '2026-01-15T12:00', zone.id))
  );

  for (let index = 0; index < fragments.length; index += 1) {
    await page.evaluate((fragment) => {
      history.replaceState(null, '', `#${fragment}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }, fragments[index]);
    await expect(page.getByRole('heading', { name: timeZones[index].id })).toBeVisible();
    await expect(page.getByText('This event link is not valid')).toHaveCount(0);
    if (browserName === 'webkit') await page.waitForTimeout(105);
  }
});

test('has no serious or critical accessibility violations in creator and viewer states', async ({ page }) => {
  await page.goto('./');
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical'))
    .toEqual([]);

  const event = createEventPayload('Accessible event', '2026-06-15T12:00', 'UTC');
  await page.goto(`./#${serializeEvent(event)}`);
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical'))
    .toEqual([]);
  await expect(page.getByText('Your local time')).toHaveCSS('text-align', 'center');
});
