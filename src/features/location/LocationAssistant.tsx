import { useState } from 'react';

import { useAppState } from '../../app/app-state';
import {
  COUNTRY_LOOKUP_PROVIDER,
  deriveTimeZoneCandidates,
  requestCoordinates,
  reverseGeocodeCountry,
  type ZoneCandidates,
} from '../../domain/location';

interface LocationAssistantProps {
  onTimeZoneSelect: (timeZone: string) => void;
}

export function LocationAssistant({ onTimeZoneSelect }: LocationAssistantProps) {
  const { locale, t } = useAppState();
  const [status, setStatus] = useState<'idle' | 'locating' | 'ready' | 'error'>('idle');
  const [result, setResult] = useState<ZoneCandidates | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const locate = async () => {
    setStatus('locating');
    setCountry(null);
    try {
      const coordinates = await requestCoordinates();
      const candidates = await deriveTimeZoneCandidates(coordinates);
      setResult(candidates);
      setStatus('ready');
    } catch {
      setResult(null);
      setStatus('error');
    }
  };

  const lookupCountry = async () => {
    if (!result) return;
    if (!navigator.onLine) {
      setLookupStatus('error');
      return;
    }
    setLookupStatus('loading');
    try {
      const lookup = await reverseGeocodeCountry(result.coordinates, locale);
      setCountry(`${lookup.countryName} (${lookup.countryCode})`);
      setLookupStatus('idle');
    } catch {
      setLookupStatus('error');
    }
  };

  return (
    <details className='location-assistant'>
      <summary>{t('locationTitle')}</summary>
      <div className='details-body'>
        <p>{t('locationIntro')}</p>
        <button className='button secondary' type='button' onClick={locate}>
          {status === 'locating' ? t('locating') : t('enableLocation')}
        </button>
        {status === 'error' && <p className='status error' role='status'>{t('locationError')}</p>}
        {result && (
          <div className='location-result'>
            <p>
              <strong>{t('locationCandidates')}</strong>
            </p>
            {result.uncertain && <p className='status'>{t('locationUncertain')}</p>}
            <div className='chip-row'>
              {result.timeZones.map((zone) => (
                <button
                  className='chip'
                  type='button'
                  key={zone}
                  onClick={() => onTimeZoneSelect(zone)}
                >
                  {zone}
                </button>
              ))}
            </div>
            <div className='consent-card'>
              <h3>{t('countryLookupTitle')}</h3>
              <p>{t('countryLookupDisclosure')}</p>
              <p className='coordinate-preview'>
                {result.coordinates.latitude.toFixed(4)}, {result.coordinates.longitude.toFixed(4)}
                {' '}
                ±{Math.round(result.coordinates.accuracyMeters)} m
              </p>
              <div className='button-row'>
                <button className='button secondary' type='button' onClick={lookupCountry}>
                  {lookupStatus === 'loading' ? t('locating') : t('lookupCountry')}
                </button>
                <a
                  href={COUNTRY_LOOKUP_PROVIDER.privacyUrl}
                  target='_blank'
                  rel='noreferrer'
                >
                  {t('providerPolicy')}
                </a>
              </div>
              {country && <p className='status success' role='status'>{country}</p>}
              {lookupStatus === 'error' && (
                <p className='status error' role='status'>
                  {navigator.onLine ? t('locationError') : t('offlineLookup')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
