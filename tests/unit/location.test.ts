import { describe, expect, it, vi } from 'vitest';

import { deriveTimeZoneCandidates, reverseGeocodeCountry } from '../../src/domain/location';

describe('location assistance', () => {
  it('derives Amsterdam locally without a network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await deriveTimeZoneCandidates({
      latitude: 52.3676,
      longitude: 4.9041,
      accuracyMeters: 50,
    });
    expect(result.timeZones).toContain('Europe/Amsterdam');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('sends only the consented reverse-geocoding fields and reads country data', async () => {
    const fetcher = vi.fn(async (request: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(request));
      expect(url.origin).toBe('https://nominatim.openstreetmap.org');
      expect(url.searchParams.get('lat')).toBe('52.3676');
      expect(url.searchParams.get('lon')).toBe('4.9041');
      expect(init?.cache).toBe('no-store');
      expect(init?.credentials).toBe('omit');
      expect(init?.referrerPolicy).toBe('strict-origin');
      return new Response(
        JSON.stringify({ address: { country: 'Nederland', country_code: 'nl' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    await expect(
      reverseGeocodeCountry(
        { latitude: 52.3676, longitude: 4.9041, accuracyMeters: 50 },
        'nl',
        fetcher,
      ),
    ).resolves.toEqual({ countryName: 'Nederland', countryCode: 'NL' });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
