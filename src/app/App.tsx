import { useEffect, useState } from 'react';

import { AppHeader } from '../components/AppHeader';
import { TrustStrip } from '../components/TrustStrip';
import type { EventPayload } from '../domain/event';
import { parseEventFragment, type ShareLinkResult } from '../domain/share-link';
import { CreateEvent } from '../features/create-event/CreateEvent';
import { EventViewer } from '../features/event-viewer/EventViewer';
import { useAppState } from './app-state';

declare global {
  interface Window {
    __worldtimeUpdate?: () => Promise<void>;
  }
}

type Route =
  | { kind: 'create'; }
  | { kind: 'event'; event: EventPayload; }
  | { kind: 'invalid'; error: Extract<ShareLinkResult, { ok: false; }>['error']; };

const errorMessageKeys = {
  duplicate: 'invalidDuplicate',
  version: 'invalidVersion',
  incomplete: 'invalidIncomplete',
  timezone: 'invalidTimezone',
  offset: 'invalidOffset',
  name: 'invalidName',
  inconsistent: 'invalidInconsistent',
  datetime: 'invalidDatetime',
} as const;

const readRoute = (): Route => {
  const fragment = window.location.hash.slice(1);
  if (!fragment) return { kind: 'create' };
  const result = parseEventFragment(fragment);
  return result.ok
    ? { kind: 'event', event: result.event }
    : { kind: 'invalid', error: result.error };
};

export function App() {
  const { t } = useAppState();
  const [route, setRoute] = useState<Route>(readRoute);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('worldtime:update-ready', onUpdate);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('worldtime:update-ready', onUpdate);
    };
  }, []);

  const createAnother = () => {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    setRoute({ kind: 'create' });
  };

  return (
    <div className='app'>
      <div className='aurora aurora-one' aria-hidden='true' />
      <div className='aurora aurora-two' aria-hidden='true' />
      <AppHeader />

      {route.kind === 'create' && <CreateEvent />}
      {route.kind === 'event' && (
        <EventViewer
          event={route.event}
          onCreateAnother={createAnother}
        />
      )}
      {route.kind === 'invalid' && (
        <main className='page-shell error-page'>
          <section className='glass-card'>
            <p className='eyebrow'>404 · TIME DRIFT</p>
            <h1>{t('invalidLinkTitle')}</h1>
            <p>{t(errorMessageKeys[route.error])}</p>
            <button className='button primary' type='button' onClick={createAnother}>
              {t('createAnother')}
            </button>
          </section>
        </main>
      )}

      <TrustStrip />
      <footer>
        <span>{t('installNote')}</span>
        <span className='source-links'>
          <a href='https://www.geonames.org/' target='_blank' rel='noreferrer'>
            GeoNames (CC BY 4.0)
          </a>
          {' · '}
          <a href='https://www.naturalearthdata.com/' target='_blank' rel='noreferrer'>
            Natural Earth
          </a>
          {' · '}
          <a
            href='https://www.openstreetmap.org/copyright'
            target='_blank'
            rel='noreferrer'
          >
            © OpenStreetMap contributors
          </a>
        </span>
      </footer>

      {updateReady && (
        <div className='update-toast' role='status'>
          <span>{t('updateReady')}</span>
          <button type='button' onClick={() => window.__worldtimeUpdate?.()}>
            {t('updateNow')}
          </button>
          <button type='button' onClick={() => setUpdateReady(false)}>
            {t('dismiss')}
          </button>
        </div>
      )}
    </div>
  );
}
