import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import timeZoneRules from '../src/data/generated/time-zone-rules.json';
import { initializeTimeZoneRules } from '../src/domain/temporal';

initializeTimeZoneRules(timeZoneRules);

afterEach(() => cleanup());
