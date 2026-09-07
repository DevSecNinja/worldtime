import {
  Component,
  type ErrorInfo,
  lazy,
  type ReactNode,
  Suspense,
  useMemo,
  useState,
} from 'react';

import { useAppState } from '../../app/app-state';
import { getCountry, searchCountries } from '../../domain/timezone-search';
import { TimeZonePicker } from '../timezone-picker/TimeZonePicker';

const GlobeExplorer = lazy(() => import('../globe/GlobeExplorer'));

interface LocationExplorerProps {
  timeZone: string | null;
  onTimeZoneChange: (timeZone: string | null) => void;
}

class GlobeErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; },
  { failed: boolean; }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // The localized fallback keeps the complete search experience available.
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function LocationExplorer({ timeZone, onTimeZoneChange }: LocationExplorerProps) {
  const { locale, t } = useAppState();
  const [countryQuery, setCountryQuery] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [showGlobe, setShowGlobe] = useState(false);
  const countryResults = useMemo(
    () => searchCountries(countryQuery, locale, 8),
    [countryQuery, locale],
  );
  const selectedCountry = getCountry(selectedCountryCode);

  const chooseCountry = (alpha2: string) => {
    const country = getCountry(alpha2);
    if (!country) return;
    setSelectedCountryCode(alpha2);
    setCountryQuery(country.names[locale]);
    onTimeZoneChange(country.timeZones.length === 1 ? country.timeZones[0] : null);
  };

  return (
    <section className='explorer-panel' aria-labelledby='explorer-title'>
      <p className='eyebrow'>{t('compareTitle')}</p>
      <h2 id='explorer-title'>{t('compareTitle')}</h2>
      <p>{t('compareIntro')}</p>
      <div className='field country-search'>
        <label htmlFor='country-search'>{t('country')}</label>
        <input
          id='country-search'
          type='search'
          value={countryQuery}
          placeholder={t('searchCountry')}
          onChange={(event) => {
            if (selectedCountryCode) onTimeZoneChange(null);
            setCountryQuery(event.target.value);
            setSelectedCountryCode('');
          }}
        />
        {countryQuery && !selectedCountry && (
          <ul className='country-results'>
            {countryResults.map((country) => (
              <li key={country.alpha2}>
                <button type='button' onClick={() => chooseCountry(country.alpha2)}>
                  <span>{country.names[locale]}</span>
                  <small>{country.alpha2} · {country.timeZones.length}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedCountry && selectedCountry.timeZones.length > 1 && (
        <div className='country-zone-choice'>
          <p>{t('chooseTimeZone')}</p>
          <div className='chip-row'>
            {selectedCountry.timeZones.map((zone) => (
              <button
                className={`chip ${zone === timeZone ? 'selected' : ''}`}
                type='button'
                key={zone}
                onClick={() => onTimeZoneChange(zone)}
              >
                {zone}
              </button>
            ))}
          </div>
        </div>
      )}
      {selectedCountry?.requiresManualTimeZone && (
        <p className='status warning'>{t('manualCountryZone')}</p>
      )}

      <TimeZonePicker
        id='comparison-timezone'
        value={timeZone ?? ''}
        onChange={(zone) => onTimeZoneChange(zone || null)}
        label={t('searchTimeZone')}
      />

      <button
        type='button'
        className='button secondary globe-toggle'
        onClick={() => setShowGlobe((current) => !current)}
      >
        {showGlobe ? t('closeGlobe') : t('openGlobe')}
      </button>
      {showGlobe && (
        <GlobeErrorBoundary
          fallback={<div className='globe-placeholder globe-error'>{t('globeUnavailable')}</div>}
        >
          <Suspense fallback={<div className='globe-placeholder'>{t('globeLoading')}</div>}>
            <GlobeExplorer onCountrySelect={chooseCountry} />
          </Suspense>
        </GlobeErrorBoundary>
      )}
    </section>
  );
}
