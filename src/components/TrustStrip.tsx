import { useAppState } from '../app/app-state';

const LockIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path d='M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6V10Z' />
  </svg>
);

const CloudIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path d='M6.5 18a4.5 4.5 0 0 1-.5-8.97A6.5 6.5 0 0 1 18.4 11 3.5 3.5 0 0 1 18 18H6.5Z' />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 7v5l3 2' />
  </svg>
);

export function TrustStrip() {
  const { t } = useAppState();
  return (
    <aside className='trust-strip' aria-label={t('trustLabel')}>
      <ul>
        <li>
          <LockIcon />
          {t('privacyLabel')}
        </li>
        <li>
          <CloudIcon />
          {t('offlineLabel')}
        </li>
        <li>
          <ClockIcon />
          {t('exactZoneLabel')}
        </li>
      </ul>
    </aside>
  );
}
