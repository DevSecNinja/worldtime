import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import { App } from './app/App';
import { AppStateProvider } from './app/app-state';
import { initializeTimeZoneRules } from './domain/temporal';
import './styles/global.css';

const rulesResponse = await fetch(new URL('data/generated/time-zone-rules.json', document.baseURI));
if (!rulesResponse.ok) {
  throw new Error(`Unable to load time-zone rules (${rulesResponse.status}).`);
}
initializeTimeZoneRules(await rulesResponse.json());

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
