import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AppStateProvider } from '../../src/app/app-state';
import { AppHeader } from '../../src/components/AppHeader';
import { en } from '../../src/i18n/en';
import { nl } from '../../src/i18n/nl';

describe('localization and ephemeral theme', () => {
  it('keeps English and Dutch message catalogs complete', () => {
    expect(Object.keys(nl).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(nl).every(Boolean)).toBe(true);
  });

  it('switches locale and theme in memory', async () => {
    const user = userEvent.setup();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(
      <AppStateProvider>
        <AppHeader />
      </AppStateProvider>,
    );
    await user.selectOptions(screen.getByLabelText('Language'), 'nl');
    expect(screen.getByLabelText('Taal')).toHaveValue('nl');
    await user.selectOptions(screen.getByLabelText('Thema'), 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(setItem).not.toHaveBeenCalled();
  });
});
