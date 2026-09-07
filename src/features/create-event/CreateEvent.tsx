import { useMemo, useState } from 'react';

import { useAppState } from '../../app/app-state';
import type { EventPayload } from '../../domain/event';
import { buildNativeShareData, buildShareUrl } from '../../domain/share-link';
import {
  classifyWallTime,
  createEventPayload,
  type WallTimeResolution,
} from '../../domain/temporal';
import { LocationAssistant } from '../location/LocationAssistant';
import { TimeZonePicker } from '../timezone-picker/TimeZonePicker';

const initialDateTime = () => {
  const nextHour = new Date(Date.now() + 60 * 60 * 1_000);
  return {
    date: `${nextHour.getFullYear()}-${String(nextHour.getMonth() + 1).padStart(2, '0')}`
      + `-${String(nextHour.getDate()).padStart(2, '0')}`,
    time: `${String(nextHour.getHours()).padStart(2, '0')}:00`,
  };
};

export function CreateEvent({ onCreated }: { onCreated?: (event: EventPayload) => void; }) {
  const { locale, t } = useAppState();
  const initial = useMemo(initialDateTime, []);
  const [name, setName] = useState('');
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [timeZone, setTimeZone] = useState('');
  const [resolution, setResolution] = useState<WallTimeResolution | undefined>();
  const [shareUrl, setShareUrl] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'fallback'>('idle');
  const [nativeShareState, setNativeShareState] = useState<
    'idle' | 'shared' | 'fallback' | 'error'
  >('idle');

  const local = date && time ? `${date}T${time}` : '';
  const classification = useMemo(
    () => local && timeZone ? classifyWallTime(local, timeZone) : null,
    [local, timeZone],
  );

  const requiresResolution = classification?.kind === 'ambiguous'
    || classification?.kind === 'nonexistent';
  const canShare = Boolean(
    date
      && time
      && timeZone
      && classification
      && classification.kind !== 'invalid'
      && (!requiresResolution || resolution),
  );

  const createSharePackage = () => {
    const event = createEventPayload(name, local, timeZone, resolution);
    const link = buildShareUrl(event);
    setShareUrl(link);
    onCreated?.(event);
    return { event, link };
  };

  const copyLink = async () => {
    if (!canShare) return;
    const { link } = createSharePackage();
    setNativeShareState('idle');
    try {
      await navigator.clipboard.writeText(link);
      setCopyState('copied');
    } catch {
      setCopyState('fallback');
    }
  };

  const shareEvent = async () => {
    if (!canShare) return;
    const { event, link } = createSharePackage();
    const data = buildNativeShareData(event, locale, link);
    setCopyState('idle');
    setNativeShareState('idle');

    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
        setNativeShareState('shared');
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setNativeShareState('error');
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
      setNativeShareState('fallback');
    } catch {
      setNativeShareState('error');
    }
  };

  const resetResolution = () => {
    setResolution(undefined);
    setShareUrl('');
    setCopyState('idle');
    setNativeShareState('idle');
  };

  return (
    <main className='page-shell create-layout'>
      <section className='hero-copy'>
        <p className='eyebrow'>{t('creatorEyebrow')}</p>
        <h1>{t('creatorTitle')}</h1>
        <p className='hero-intro'>{t('creatorIntro')}</p>
        <div className='orbital-art' aria-hidden='true'>
          <span className='orbit orbit-one' />
          <span className='orbit orbit-two' />
          <span className='planet'>
            <span />
          </span>
        </div>
      </section>

      <section className='glass-card form-card' aria-labelledby='event-form-title'>
        <div className='step-label'>
          <span>01</span> {t('creatorEyebrow')}
        </div>
        <h2 id='event-form-title'>{t('createLink')}</h2>
        <div className='field'>
          <label htmlFor='event-name'>{t('eventName')}</label>
          <p className='field-hint' id='event-name-hint'>{t('eventNameHint')}</p>
          <input
            id='event-name'
            value={name}
            maxLength={120}
            aria-describedby='event-name-hint'
            onChange={(event) => {
              setName(event.target.value);
              resetResolution();
            }}
          />
        </div>

        <div className='field-grid'>
          <div className='field'>
            <label htmlFor='event-date'>{t('date')}</label>
            <input
              id='event-date'
              type='date'
              min='1970-01-01'
              max='2100-12-31'
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                resetResolution();
              }}
            />
          </div>
          <div className='field'>
            <label htmlFor='event-time'>{t('time')}</label>
            <input
              id='event-time'
              type='time'
              value={time}
              onChange={(event) => {
                setTime(event.target.value);
                resetResolution();
              }}
            />
          </div>
        </div>

        <TimeZonePicker
          value={timeZone}
          onChange={(value) => {
            setTimeZone(value);
            resetResolution();
          }}
          hint={t('timeZoneHint')}
        />

        {classification?.kind === 'invalid' && (
          <p className='status error' role='alert'>{t('requiredFields')}</p>
        )}

        {requiresResolution && (
          <fieldset className='dst-card'>
            <legend>
              {classification.kind === 'ambiguous'
                ? t('ambiguousTitle')
                : t('nonexistentTitle')}
            </legend>
            <p>
              {classification.kind === 'ambiguous'
                ? t('ambiguousBody')
                : t('nonexistentBody')}
            </p>
            {(['earlier', 'later'] as const).map((choice) => {
              const option = classification[choice];
              return (
                <label className='choice-card' key={choice}>
                  <input
                    type='radio'
                    name='dst-resolution'
                    value={choice}
                    checked={resolution === choice}
                    onChange={() => setResolution(choice)}
                  />
                  <span>
                    <strong>
                      {classification.kind === 'ambiguous'
                        ? choice === 'earlier' ? t('earlier') : t('later')
                        : choice === 'earlier'
                        ? t('moveEarlier')
                        : t('moveLater')}
                    </strong>
                    <small>
                      {option.local}
                      {' · '}
                      {option.offset}
                    </small>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        <LocationAssistant
          onTimeZoneSelect={(value) => {
            setTimeZone(value);
            resetResolution();
          }}
        />

        <div className='share-actions'>
          <button
            className='button primary share-button'
            type='button'
            disabled={!canShare}
            onClick={copyLink}
          >
            <span>{t('copyLink')}</span>
            <span aria-hidden='true'>↗</span>
          </button>
          <button
            className='button secondary share-button'
            type='button'
            disabled={!canShare}
            onClick={shareEvent}
          >
            <span>{t('shareEvent')}</span>
            <span aria-hidden='true'>⌁</span>
          </button>
        </div>
        <p className='status' role='status' aria-live='polite'>
          {copyState === 'copied'
            ? t('copied')
            : copyState === 'fallback'
            ? t('copyFallback')
            : nativeShareState === 'shared'
            ? t('shared')
            : nativeShareState === 'fallback'
            ? t('shareFallback')
            : nativeShareState === 'error'
            ? t('shareError')
            : ''}
        </p>
        {shareUrl && (
          <input
            className='share-output'
            value={shareUrl}
            readOnly
            aria-label={t('copyLink')}
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
      </section>
    </main>
  );
}
