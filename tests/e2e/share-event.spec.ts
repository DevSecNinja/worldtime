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
  await page.getByLabel('Hour').selectOption('9');
  await page.getByLabel('Minute').selectOption('30');
  await page.getByRole('combobox', { name: 'Event time zone' }).fill('ams');
  const amsterdamTimeZone = page.getByRole('option', {
    name: /^Europe\/Amsterdam Time zone/,
  });
  await expect(amsterdamTimeZone).toBeVisible();
  await amsterdamTimeZone.click();
  const copyButton = page.getByRole('button', { name: /Copy link/ });
  await expect(copyButton).toBeEnabled();
  await copyButton.click();
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
  await page.getByRole('option', {
    name: /^Europe\/Amsterdam Time zone/,
  }).click();
  await page.getByLabel('Time format').selectOption('h12');
  await page.getByRole('button', { name: 'Share event' }).click();

  const shareData = await page.evaluate(
    () => (window as typeof window & { __sharedData?: ShareData; }).__sharedData,
  );
  expect(shareData?.title).toBe('Launch');
  expect(shareData?.text).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
  expect(shareData?.text).toContain('Europe/Amsterdam');
  expect(shareData?.text).toContain('Open Worldtime');
  expect(shareData?.url).toContain('#v=1&name=Launch');
});

test('switches event cards between 24-hour and AM/PM display', async ({ page }) => {
  await page.goto('./');
  const deviceTimeZone = await page.evaluate(() =>
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const event = createEventPayload('Format check', '2026-06-15T13:30', deviceTimeZone);
  await page.goto(`./#${serializeEvent(event)}`);
  await expect(page.getByText('Your device and creator time')).toBeVisible();
  await expect(page.getByText('13:30').first()).toBeVisible();
  await page.getByLabel('Time format').selectOption('h12');
  await expect(page.getByText(/1:30 PM/).first()).toBeVisible();
});

test('switches creator time controls between 24-hour and AM/PM entry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 840 });
  await page.goto('./');
  const formBox = await page.locator('.form-card').boundingBox();
  expect(formBox?.y ?? 1000).toBeLessThan(560);
  await expect(page.getByLabel('Hour').locator('option')).toHaveCount(24);
  const hourBox = await page.getByLabel('Hour').boundingBox();
  const minuteBox = await page.getByLabel('Minute').boundingBox();
  expect(Math.abs((hourBox?.y ?? 0) - (minuteBox?.y ?? 0))).toBeLessThan(3);
  await page.getByLabel('Time format').selectOption('h12');
  await expect(page.getByLabel('Hour').locator('option')).toHaveCount(12);
  await expect(page.getByLabel('AM or PM')).toBeVisible();
});

test('keeps the creator form within the first tablet viewport', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 600 });
  await page.goto('./');
  const formBox = await page.locator('.form-card').boundingBox();
  expect(formBox?.y ?? 1000).toBeLessThan(560);
});

test('enforces event-name limits and renders shared names as inert text', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel('Event name').fill('a'.repeat(121));
  await expect(page.getByText(/no more than 120 characters/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeDisabled();

  const markup = '<img src=x onerror=alert(1)>';
  const event = createEventPayload(markup, '2026-06-15T13:30', 'UTC');
  await page.goto(`./#${serializeEvent(event)}`);
  await expect(page.getByRole('heading', { name: markup })).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
});

test('renders every supported zone link in a real browser', async ({ page, browserName }) => {
  test.setTimeout(180_000);
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
