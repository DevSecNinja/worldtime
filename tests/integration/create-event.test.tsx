import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import vilaCities from '../../public/data/generated/cities/vi.json';
import cityPrefixes from '../../public/data/generated/city-prefixes/v.json';
import { AppStateProvider } from '../../src/app/app-state';
import { CreateEvent } from '../../src/features/create-event/CreateEvent';

describe('event creation flow', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
  });

  it('finds Amsterdam from ams and copies a share link', async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.spyOn(navigator.clipboard, 'writeText');
    render(
      <AppStateProvider>
        <CreateEvent />
      </AppStateProvider>,
    );
    const picker = screen.getByRole('combobox', { name: 'Event time zone' });
    await user.type(picker, 'ams');
    await user.click(screen.getByRole('option', { name: /Europe\/Amsterdam/ }));
    await user.click(screen.getByRole('button', { name: /Copy link/ }));
    expect(clipboardWrite).toHaveBeenCalledWith(
      expect.stringContaining('#v=1&'),
    );
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });

  it('finds a GeoNames city outside the curated time-zone metadata', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (request) => {
      const url = String(request);
      return new Response(
        JSON.stringify(url.includes('city-prefixes') ? cityPrefixes : vilaCities),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });
    render(
      <AppStateProvider>
        <CreateEvent />
      </AppStateProvider>,
    );
    const picker = screen.getByRole('combobox', { name: 'Event time zone' });
    await user.type(picker, 'Vila');
    const city = await screen.findByRole('option', {
      name: /Vila, Andorra.*Europe\/Andorra/,
    });
    await user.click(city);
    expect(picker).toHaveValue('Europe/Andorra');
    fetchSpy.mockRestore();
  });

  it('requires explicit DST resolution', async () => {
    const user = userEvent.setup();
    render(
      <AppStateProvider>
        <CreateEvent />
      </AppStateProvider>,
    );
    await user.clear(screen.getByLabelText('Date'));
    await user.type(screen.getByLabelText('Date'), '2026-10-25');
    await user.selectOptions(screen.getByLabelText('Hour'), '2');
    await user.selectOptions(screen.getByLabelText('Minute'), '30');
    const picker = screen.getByRole('combobox', { name: 'Event time zone' });
    await user.type(picker, 'ams');
    await user.click(screen.getByRole('option', { name: /Europe\/Amsterdam/ }));
    expect(screen.getByText('This clock time happens twice')).toBeInTheDocument();
    const copyButton = screen.getByRole('button', { name: /Copy link/ });
    expect(copyButton).toBeDisabled();
    await user.click(screen.getByLabelText(/Earlier occurrence/));
    expect(copyButton).toBeEnabled();
  });

  it('requires reconfirmation after editing a selected time zone', async () => {
    const user = userEvent.setup();
    render(
      <AppStateProvider>
        <CreateEvent />
      </AppStateProvider>,
    );
    const picker = screen.getByRole('combobox', { name: 'Event time zone' });
    await user.type(picker, 'ams');
    await user.click(screen.getAllByRole('option', { name: /Europe\/Amsterdam/ })[0]);
    expect(screen.getByRole('button', { name: /Copy link/ })).toBeEnabled();
    await user.clear(picker);
    await user.type(picker, 'Tokyo');
    expect(picker).toHaveValue('Tokyo');
    expect(screen.getByRole('button', { name: /Copy link/ })).toBeDisabled();
  });

  it('opens the operating-system share mechanism with event text and URL', async () => {
    const user = userEvent.setup();
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: nativeShare,
    });
    render(
      <AppStateProvider>
        <CreateEvent />
      </AppStateProvider>,
    );
    await user.type(screen.getByLabelText('Event name'), 'Launch');
    const picker = screen.getByRole('combobox', { name: 'Event time zone' });
    await user.type(picker, 'ams');
    await user.click(screen.getAllByRole('option', { name: /Europe\/Amsterdam/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Share event' }));

    expect(nativeShare).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Launch',
      text: expect.stringContaining('Europe/Amsterdam'),
      url: expect.stringContaining('#v=1&name=Launch'),
    }));
    expect(await screen.findByText('Shared with your device.')).toBeInTheDocument();
  });

  it('has no serious or critical automated accessibility violations', async () => {
    const { container } = render(
      <AppStateProvider>
        <CreateEvent />
      </AppStateProvider>,
    );
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
      },
    });
    expect(
      results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical'
      ),
    ).toEqual([]);
  });
});
