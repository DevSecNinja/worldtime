import referenceData from '../../reference-data.json';

export const REFERENCE_DATA_VERSION = referenceData.sha256.slice(0, 12);
export const CITY_CACHE_NAME = `worldtime-city-search-${REFERENCE_DATA_VERSION}`;
