export type Locale = 'en' | 'nl';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface EventPayload {
  version: 1;
  name: string | null;
  local: string;
  sourceTimeZone: string;
  sourceOffset: string;
  instant: string;
}

export interface EventDraft {
  name: string;
  date: string;
  time: string;
  sourceTimeZone: string;
}

export interface TimeZoneRecord {
  id: string;
  countries: string[];
  coordinates: string;
  comment: string;
  cities: string[];
  alternativeName: string;
  searchText: string;
}

export interface CountryRecord {
  alpha2: string;
  numeric: string | null;
  names: Record<Locale, string>;
  timeZones: string[];
  requiresManualTimeZone: boolean;
  cityCount: number;
  hasGeometry: boolean;
}

export type CityRecord = [
  id: number,
  name: string,
  asciiName: string,
  countryCode: string,
  timeZone: string,
  population: number,
  searchTokens: string[],
];

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export interface CountryLookup {
  countryName: string;
  countryCode: string;
}
