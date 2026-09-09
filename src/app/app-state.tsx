import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import type { Locale, ThemeMode, TimeFormat } from '../domain/event';
import { browserLocale, type MessageKey, translate } from '../i18n';

interface AppStateValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  timeFormat: TimeFormat;
  setTimeFormat: (timeFormat: TimeFormat) => void;
  t: (key: MessageKey) => string;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode; }) {
  const [locale, setLocale] = useState<Locale>(() => browserLocale());
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('h23');

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'system' ? 'light dark' : theme;
  }, [theme]);

  const value = useMemo<AppStateValue>(() => ({
    locale,
    setLocale,
    theme,
    setTheme,
    timeFormat,
    setTimeFormat,
    t: (key) => translate(locale, key),
  }), [locale, theme, timeFormat]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider.');
  return value;
}
