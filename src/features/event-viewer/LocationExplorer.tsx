import {
  Component,
  type ErrorInfo,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAppState } from '../../app/app-state';
import { type CitySearchResult, searchCities } from '../../domain/city-search';
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
  const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
  const [showGlobe, setShowGlobe] = useState(false);
  const countryResults = useMemo(
    () => searchCountries(countryQuery, locale, 8),
    [countryQuery, locale],
  );
  const selectedCountry = getCountry(selectedCountryCode);

  useEffect(() => {
    let active = true;
    searchCities(countryQuery, locale, 8)
      .then((page) => {
        if (active) setCityResults(page.results);
      })
      .catch(() => {
        if (active) setCityResults([]);
      });
    return () => {
      active = false;
    };
  }, [countryQuery, locale]);

  const chooseCountry = (alpha2: string) => {
    const country = getCountry(alpha2);
    if (!country) return;
    setSelectedCountryCode(alpha2);
    setCountryQuery(country.names[locale]);
    onTimeZoneChange(country.timeZones.length === 1 ? country.timeZones[0] : null);
  };

  const chooseCity = (city: CitySearchResult) => {
    setSelectedCountryCode(city.countryCode);
    setCountryQuery(`${city.name}, ${city.countryName}`);
    onTimeZoneChange(city.timeZone);
  };

  return (
    <section className='explorer-panel' aria-labelledby='explorer-title'>
      <p className='eyebrow'>{t('compareTitle')}</p>
      <h2 id='explorer-title'>{t('compareTitle')}</h2>
      <p>{t('compareIntro')}</p>
      <div className='field country-search'>
        <label htmlFor='country-search'>{t('countryOrCity')}</label>
        <input
          id='country-search'
          type='search'
          value={countryQuery}
          placeholder={t('searchCountryOrCity')}
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
            {cityResults.map((city) => (
              <li key={`city-${city.id}`}>
                <button type='button' onClick={() => chooseCity(city)}>
                  <span>{city.name}, {city.countryName}</span>
                  <small>{city.timeZone}</small>
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

      {!showGlobe && (
        <button
          type='button'
          className='globe-preview'
          onClick={() => setShowGlobe(true)}
          aria-label={t('openGlobe')}
        >
          <span className='preview-globe' aria-hidden='true'>
            <span className='preview-meridian' />
            <span className='preview-latitude' />
          </span>
          <span>
            <strong>{t('openGlobe')}</strong>
            <small>{t('globeHelp')}</small>
          </span>
        </button>
      )}
      {showGlobe && (
        <>
          <button
            type='button'
            className='button secondary globe-toggle'
            onClick={() => setShowGlobe(false)}
          >
            {t('closeGlobe')}
          </button>
          <GlobeErrorBoundary
            fallback={<div className='globe-placeholder globe-error'>{t('globeUnavailable')}</div>}
          >
            <Suspense fallback={<div className='globe-placeholder'>{t('globeLoading')}</div>}>
              <GlobeExplorer onCountrySelect={chooseCountry} />
            </Suspense>
          </GlobeErrorBoundary>
        </>
      )}
    </section>
  );
}
