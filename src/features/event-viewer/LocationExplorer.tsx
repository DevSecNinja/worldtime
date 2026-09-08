import { Component, type ErrorInfo, lazy, type ReactNode, Suspense, useState } from 'react';

import { useAppState } from '../../app/app-state';
import { getCountry } from '../../domain/timezone-search';
import { LocationAssistant } from '../location/LocationAssistant';
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
  const { t } = useAppState();
  const [showGlobe, setShowGlobe] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [globeCountryCode, setGlobeCountryCode] = useState('');
  const globeCountry = getCountry(globeCountryCode);

  const chooseGlobeCountry = (countryCode: string) => {
    const country = getCountry(countryCode);
    if (!country) return;
    setGlobeCountryCode(countryCode);
    onTimeZoneChange(country.timeZones.length === 1 ? country.timeZones[0] : null);
  };

  return (
    <section className='explorer-panel' aria-labelledby='explorer-title'>
      <p className='eyebrow'>{t('compareTitle')}</p>
      <h2 id='explorer-title'>{t('compareTitle')}</h2>
      <p>{t('compareIntro')}</p>

      <TimeZonePicker
        id='comparison-timezone'
        value={timeZone ?? ''}
        onChange={(zone) => onTimeZoneChange(zone || null)}
        label={t('searchPlaceLabel')}
        hint={t('searchPlaceHint')}
        includeCountries
        onRequestLocation={() => setShowLocation(true)}
      />

      {showLocation && (
        <LocationAssistant
          onClose={() => setShowLocation(false)}
          onTimeZoneSelect={(zone) => {
            onTimeZoneChange(zone);
            setShowLocation(false);
          }}
        />
      )}

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
              <GlobeExplorer onCountrySelect={chooseGlobeCountry} />
            </Suspense>
          </GlobeErrorBoundary>
          {globeCountry && globeCountry.timeZones.length > 1 && (
            <div className='country-zone-choice'>
              <p>{t('chooseTimeZone')}</p>
              <div className='chip-row'>
                {globeCountry.timeZones.map((zone) => (
                  <button
                    className='chip'
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
        </>
      )}
    </section>
  );
}
