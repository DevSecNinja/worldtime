import type { CountryLookup, LocationCoordinates } from './event';
import { isSupportedTimeZone } from './temporal';

export interface ZoneCandidates {
  coordinates: LocationCoordinates;
  timeZones: string[];
  uncertain: boolean;
}

export const COUNTRY_LOOKUP_PROVIDER = {
  name: 'OpenStreetMap Foundation Nominatim',
  url: 'https://nominatim.openstreetmap.org/',
  privacyUrl: 'https://osmfoundation.org/wiki/Privacy_Policy',
};

const offsetCoordinate = (
  latitude: number,
  longitude: number,
  distanceMeters: number,
  bearingRadians: number,
): [number, number] => {
  const earthRadius = 6_371_000;
  const angularDistance = distanceMeters / earthRadius;
  const latitudeRadians = latitude * Math.PI / 180;
  const longitudeRadians = longitude * Math.PI / 180;
  const nextLatitude = Math.asin(
    Math.sin(latitudeRadians) * Math.cos(angularDistance)
      + Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearingRadians),
  );
  const nextLongitude = longitudeRadians + Math.atan2(
    Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
    Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(nextLatitude),
  );
  return [nextLatitude * 180 / Math.PI, nextLongitude * 180 / Math.PI];
};

export function requestCoordinates(): Promise<LocationCoordinates> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Browser location services are unavailable.'));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyMeters: coords.accuracy,
        }),
      (error) => reject(new Error(error.message || 'Location permission was not granted.')),
      {
        enableHighAccuracy: false,
        maximumAge: 0,
        timeout: 10_000,
      },
    );
  });
}

export async function deriveTimeZoneCandidates(
  coordinates: LocationCoordinates,
): Promise<ZoneCandidates> {
  const module = await import('@photostructure/tz-lookup');
  const lookup = module.default;
  const sampleDistance = Math.min(Math.max(coordinates.accuracyMeters, 100), 100_000);
  const points: [number, number][] = [[coordinates.latitude, coordinates.longitude]];

  for (let index = 0; index < 8; index += 1) {
    points.push(
      offsetCoordinate(
        coordinates.latitude,
        coordinates.longitude,
        sampleDistance,
        index * Math.PI / 4,
      ),
    );
  }

  const timeZones = [
    ...new Set(points.map(([latitude, longitude]) => lookup(latitude, longitude))),
  ].filter(isSupportedTimeZone);
  if (timeZones.length === 0) {
    throw new Error('No supported time zone could be derived from this location.');
  }
  return {
    coordinates,
    timeZones,
    uncertain: timeZones.length > 1 || coordinates.accuracyMeters > 25_000,
  };
}

export async function reverseGeocodeCountry(
  coordinates: LocationCoordinates,
  locale: 'en' | 'nl',
  fetcher: typeof fetch = fetch,
): Promise<CountryLookup> {
  const url = new URL('reverse', COUNTRY_LOOKUP_PROVIDER.url);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(coordinates.latitude));
  url.searchParams.set('lon', String(coordinates.longitude));
  url.searchParams.set('zoom', '3');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', locale);

  const response = await fetcher(url, {
    cache: 'no-store',
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
    },
    referrerPolicy: 'strict-origin',
  });
  if (!response.ok) {
    throw new Error(`Country lookup failed with status ${response.status}.`);
  }
  const body = await response.json() as {
    address?: { country?: string; country_code?: string; };
  };
  const countryName = body.address?.country;
  const countryCode = body.address?.country_code?.toUpperCase();
  if (!countryName || !countryCode) {
    throw new Error('The provider did not return a country.');
  }
  return { countryName, countryCode };
}
