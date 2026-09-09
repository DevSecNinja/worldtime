import { useAppState } from '../app/app-state';
import type { Locale, ThemeMode, TimeFormat } from '../domain/event';

export function AppHeader() {
  const { locale, setLocale, theme, setTheme, timeFormat, setTimeFormat, t } = useAppState();

  return (
    <header className='app-header'>
      <a className='brand' href='./' aria-label={t('appName')}>
        <span className='brand-mark' aria-hidden='true'>
          <span />
        </span>
        <span>
          <strong>{t('appName')}</strong>
          <small>{t('tagline')}</small>
        </span>
      </a>

      <div className='header-controls'>
        <label className='compact-control'>
          <span className='sr-only'>{t('language')}</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            aria-label={t('language')}
          >
            <option value='en'>EN</option>
            <option value='nl'>NL</option>
          </select>
        </label>
        <label className='compact-control'>
          <span className='sr-only'>{t('timeFormat')}</span>
          <select
            value={timeFormat}
            onChange={(event) => setTimeFormat(event.target.value as TimeFormat)}
            aria-label={t('timeFormat')}
          >
            <option value='h23'>{t('timeFormat24')}</option>
            <option value='h12'>{t('timeFormat12')}</option>
          </select>
        </label>
        <label className='compact-control theme-control'>
          <span className='sr-only'>{t('theme')}</span>
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value as ThemeMode)}
            aria-label={t('theme')}
          >
            <option value='system'>{t('themeSystem')}</option>
            <option value='light'>{t('themeLight')}</option>
            <option value='dark'>{t('themeDark')}</option>
          </select>
        </label>
      </div>
    </header>
  );
}
