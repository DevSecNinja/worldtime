import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppStateProvider } from '../../src/app/app-state';
import { createEventPayload } from '../../src/domain/temporal';
import { EventViewer } from '../../src/features/event-viewer/EventViewer';

describe('event viewer', () => {
  it('shows the device and creator contexts for one stable instant', () => {
    const event = createEventPayload(
      'Launch',
      '2026-09-08T09:30',
      'Europe/Amsterdam',
    );
    render(
      <AppStateProvider>
        <EventViewer event={event} onCreateAnother={() => undefined} />
      </AppStateProvider>,
    );
    expect(screen.getByRole('heading', { name: 'Launch' })).toBeInTheDocument();
    expect(screen.getByText('Creator time')).toBeInTheDocument();
    expect(screen.getAllByText(/Europe\/Amsterdam/).length).toBeGreaterThan(0);
  });

  it('renders the encoded source wall time when rules differ', () => {
    render(
      <AppStateProvider>
        <EventViewer
          event={{
            version: 1,
            name: 'Historical intent',
            local: '2026-06-15T11:00',
            sourceTimeZone: 'Europe/Amsterdam',
            sourceOffset: '+01:00',
            instant: '2026-06-15T10:00:00Z',
          }}
          onCreateAnother={() => undefined}
        />
      </AppStateProvider>,
    );
    expect(screen.getByText('11:00')).toBeInTheDocument();
    expect(screen.getByText(/Europe\/Amsterdam · UTC\+01:00/)).toBeInTheDocument();
    expect(screen.getByText(/Time-zone rules have changed/)).toBeInTheDocument();
  });
});
