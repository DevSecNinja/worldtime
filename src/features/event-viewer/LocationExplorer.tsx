import type { ReactNode } from 'react';
import { useState } from 'react';

import { useAppState } from '../../app/app-state';
import { LocationAssistant } from '../location/LocationAssistant';
import { TimeZonePicker } from '../timezone-picker/TimeZonePicker';

interface LocationExplorerProps {
  timeZone: string | null;
  onTimeZoneChange: (timeZone: string | null) => void;
  comparison: ReactNode;
}

export function LocationExplorer({
  timeZone,
  onTimeZoneChange,
  comparison,
}: LocationExplorerProps) {
  const { t } = useAppState();
  const [showLocation, setShowLocation] = useState(false);
  const [selectionLabel, setSelectionLabel] = useState('');

  return (
    <section className='explorer-panel' aria-labelledby='explorer-title'>
      <h2 id='explorer-title'>{t('compareTitle')}</h2>
      <p className='explorer-intro'>{t('compareIntro')}</p>

      <TimeZonePicker
        id='comparison-timezone'
        value={timeZone ?? ''}
        onChange={(zone) => onTimeZoneChange(zone || null)}
        label={t('searchPlaceLabel')}
        hint={t('searchPlaceHint')}
        includeCountries
        onRequestLocation={() => setShowLocation(true)}
        onSelectionLabelChange={setSelectionLabel}
      />

      {comparison && (
        <div className='comparison-result'>
          {selectionLabel && <p className='comparison-place'>{selectionLabel}</p>}
          {comparison}
        </div>
      )}

      {showLocation && (
        <LocationAssistant
          onClose={() => setShowLocation(false)}
          onTimeZoneSelect={(zone) => {
            onTimeZoneChange(zone);
            setSelectionLabel(zone);
          }}
        />
      )}
    </section>
  );
}
