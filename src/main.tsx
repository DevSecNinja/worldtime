import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import { App } from './app/App';
import { AppStateProvider } from './app/app-state';
import { CITY_CACHE_NAME } from './domain/reference-data';
import { initializeTimeZoneRules } from './domain/temporal';
import './styles/global.css';

const [rulesResponse, aliasesResponse] = await Promise.all([
  fetch(new URL('data/generated/time-zone-rules.json', document.baseURI)),
  fetch(new URL('data/generated/time-zone-aliases.json', document.baseURI)),
]);
if (!rulesResponse.ok || !aliasesResponse.ok) {
  throw new Error(
    `Unable to load time-zone data (${rulesResponse.status}/${aliasesResponse.status}).`,
  );
}
initializeTimeZoneRules(await rulesResponse.json(), await aliasesResponse.json());

if ('caches' in globalThis) {
  void caches.keys().then((cacheNames) =>
    Promise.all(
      cacheNames
        .filter((name) =>
          name === 'worldtime-city-search'
          || name === 'worldtime-optional-globe'
          || (name.startsWith('worldtime-city-search-') && name !== CITY_CACHE_NAME)
          || name.startsWith('worldtime-optional-globe-')
        )
        .map((name) => caches.delete(name)),
    )
  ).catch((error) => console.warn('Unable to clean up an obsolete runtime cache.', error));
}

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new Event('worldtime:update-ready'));
  },
});
window.__worldtimeUpdate = () => updateSW(true);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStateProvider>
      <App />
    </AppStateProvider>
  </StrictMode>,
);
