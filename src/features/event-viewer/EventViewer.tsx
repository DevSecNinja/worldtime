import { useMemo, useState } from 'react';

import { useAppState } from '../../app/app-state';
import type { EventPayload } from '../../domain/event';
import {
  currentDeviceTimeZone,
  formatEventInZone,
  formatSourceRepresentation,
  sourceRulesChanged,
} from '../../domain/temporal';
import { LocationAssistant } from '../location/LocationAssistant';
import { LocationExplorer } from './LocationExplorer';

function TimeCard({
  label,
  date,
  time,
  zone,
  offset,
  accent = false,
}: {
  label: string;
  date: string;
  time: string;
  zone: string;
  offset: string;
  accent?: boolean;
}) {
  return (
    <article className={`time-card ${accent ? 'accent' : ''}`}>
      <p className='time-label'>{label}</p>
      <p className='time-main'>{time.replace(/\s[A-Z]{2,6}$/u, '')}</p>
      <p className='time-date'>{date}</p>
      <p className='time-zone'>
        {zone} · {offset === '+00:00' || offset === 'Z' ? 'UTC' : `UTC${offset}`}
      </p>
    </article>
  );
}

export function EventViewer({ event, onCreateAnother }: {
  event: EventPayload;
  onCreateAnother: () => void;
}) {
  const { locale, t } = useAppState();
  const deviceTimeZone = currentDeviceTimeZone();
  const [comparisonTimeZone, setComparisonTimeZone] = useState<string | null>(null);
  const deviceDisplay = useMemo(
    () => formatEventInZone(event, deviceTimeZone, locale),
    [event, deviceTimeZone, locale],
  );
  const sourceDisplay = useMemo(
    () => formatSourceRepresentation(event, locale),
    [event, locale],
  );
  const comparisonDisplay = useMemo(
    () => formatEventInZone(event, comparisonTimeZone ?? deviceTimeZone, locale),
    [event, comparisonTimeZone, deviceTimeZone, locale],
  );
  const rulesChanged = sourceRulesChanged(event);

  return (
    <main className='page-shell viewer-layout'>
      <section className='event-heading'>
        <p className='eyebrow'>{t('viewerEyebrow')}</p>
        <h1>{event.name ?? t('genericEvent')}</h1>
        <p className='relative-time'>{deviceDisplay.relative}</p>
      </section>

      <section className='time-grid' aria-label={event.name ?? t('genericEvent')}>
        <TimeCard
          label={t('localBadge')}
          date={deviceDisplay.date}
          time={deviceDisplay.time}
          zone={deviceDisplay.zone}
          offset={deviceDisplay.offset}
          accent
        />
        <TimeCard
          label={t('sourceTime')}
          date={sourceDisplay.date}
          time={sourceDisplay.time}
          zone={sourceDisplay.zone}
          offset={event.sourceOffset}
        />
        {comparisonTimeZone && comparisonTimeZone !== deviceTimeZone && (
          <TimeCard
            label={t('selectedBadge')}
            date={comparisonDisplay.date}
            time={comparisonDisplay.time}
            zone={comparisonDisplay.zone}
            offset={comparisonDisplay.offset}
          />
        )}
      </section>

      {rulesChanged && <p className='status warning' role='status'>{t('rulesChanged')}</p>}

      <div className='viewer-columns'>
        <LocationExplorer
          timeZone={comparisonTimeZone}
          onTimeZoneChange={setComparisonTimeZone}
        />
        <aside className='glass-card location-card'>
          <LocationAssistant
            onTimeZoneSelect={(zone) => setComparisonTimeZone(zone)}
          />
          <p className='privacy-mini'>{t('creatorIntro')}</p>
        </aside>
      </div>

      <button className='button ghost create-another' type='button' onClick={onCreateAnother}>
        ← {t('createAnother')}
      </button>
    </main>
  );
}
