import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { useAppState } from '../../app/app-state';
import { type CitySearchResult, searchCities } from '../../domain/city-search';
import {
  countryNamesForZone,
  getCountry,
  searchCountries,
  searchTimeZones,
} from '../../domain/timezone-search';

interface TimeZonePickerProps {
  value: string;
  onChange: (timeZone: string) => void;
  label?: string;
  hint?: string;
  id?: string;
  autoFocus?: boolean;
  includeCountries?: boolean;
  onRequestLocation?: () => void;
  onSelectionLabelChange?: (label: string) => void;
}

type PickerOption =
  | {
    kind: 'location';
    key: 'location';
    title: string;
    subtitle: string;
  }
  | {
    kind: 'country';
    key: string;
    countryCode: string;
    title: string;
    subtitle: string;
  }
  | {
    kind: 'place';
    key: string;
    timeZone: string;
    title: string;
    subtitle: string;
  };

export function TimeZonePicker({
  value,
  onChange,
  label,
  hint,
  id,
  autoFocus = false,
  includeCountries = false,
  onRequestLocation,
  onSelectionLabelChange,
}: TimeZonePickerProps) {
  const generatedId = useId();
  const inputId = id ?? `timezone-${generatedId}`;
  const listId = `${inputId}-list`;
  const hintId = `${inputId}-hint`;
  const { locale, t } = useAppState();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
  const [cityTotal, setCityTotal] = useState(0);
  const [cityLimit, setCityLimit] = useState(12);
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const userClearedSelection = useRef(false);
  const pendingDisplayLabel = useRef('');
  const zoneResults = useMemo(() => searchTimeZones(query, 8), [query]);
  const countryResults = useMemo(
    () => includeCountries ? searchCountries(query, locale, 5) : [],
    [includeCountries, locale, query],
  );
  const selectedCountry = getCountry(selectedCountryCode);

  const options = useMemo<PickerOption[]>(() => {
    const placeOptions = [
      ...cityResults.map((city) => {
        const area = city.countryCode === 'US' ? city.adminArea : '';
        return {
          kind: 'place' as const,
          key: `city-${city.id}`,
          timeZone: city.timeZone,
          title: [city.name, area, city.countryName].filter(Boolean).join(', '),
          subtitle: `${t('cityResult')} · ${city.timeZone}`,
        };
      }),
      ...zoneResults.map((zone) => ({
        kind: 'place' as const,
        key: `zone-${zone.id}`,
        timeZone: zone.id,
        title: zone.id,
        subtitle: [
          t('timeZoneResult'),
          zone.cities.slice(0, 3).join(', '),
          countryNamesForZone(zone, locale),
        ].filter(Boolean).join(' · '),
      })),
    ];
    const deduplicatedPlaces = [
      ...new Map(
        placeOptions.map((option) => [`${option.title}|${option.timeZone}`, option]),
      ).values(),
    ];
    return [
      ...(onRequestLocation && !query
        ? [{
          kind: 'location' as const,
          key: 'location' as const,
          title: t('locationTitle'),
          subtitle: t('locationOptionHint'),
        }]
        : []),
      ...countryResults.map((country) => ({
        kind: 'country' as const,
        key: `country-${country.alpha2}`,
        countryCode: country.alpha2,
        title: country.names[locale],
        subtitle: country.timeZones.length > 1
          ? t('countryNeedsZone')
          : `${t('countryResult')} · ${country.timeZones[0] ?? t('manualCountryZone')}`,
      })),
      ...deduplicatedPlaces,
    ];
  }, [cityResults, countryResults, locale, onRequestLocation, query, t, zoneResults]);

  useEffect(() => {
    if (pendingDisplayLabel.current && value) {
      setQuery(pendingDisplayLabel.current);
      pendingDisplayLabel.current = '';
      return;
    }
    if (userClearedSelection.current && !value) {
      userClearedSelection.current = false;
      return;
    }
    setQuery(value);
  }, [value]);

  useEffect(() => {
    let active = true;
    searchCities(query, locale, cityLimit)
      .then((page) => {
        if (active) {
          setCityResults(page.results);
          setCityTotal(page.total);
        }
      })
      .catch(() => {
        if (active) {
          setCityResults([]);
          setCityTotal(0);
        }
      });
    return () => {
      active = false;
    };
  }, [cityLimit, locale, query]);

  const chooseTimeZone = (timeZone: string, displayLabel = timeZone) => {
    userClearedSelection.current = false;
    pendingDisplayLabel.current = displayLabel;
    setSelectedCountryCode('');
    onChange(timeZone);
    onSelectionLabelChange?.(displayLabel);
    setQuery(displayLabel);
    setOpen(false);
  };

  const chooseOption = (option: PickerOption) => {
    if (option.kind === 'location') {
      setOpen(false);
      onRequestLocation?.();
      return;
    }
    if (option.kind === 'country') {
      const country = getCountry(option.countryCode);
      if (!country) return;
      setSelectedCountryCode(country.alpha2);
      setQuery(country.names[locale]);
      setOpen(false);
      if (country.timeZones.length === 1) {
        chooseTimeZone(country.timeZones[0], country.names[locale]);
      } else {
        userClearedSelection.current = true;
        onChange('');
      }
      return;
    }
    chooseTimeZone(option.timeZone, option.title);
  };

  return (
    <div className='field timezone-picker'>
      <label htmlFor={inputId}>{label ?? t('timeZone')}</label>
      {hint && <p className='field-hint' id={hintId}>{hint}</p>}
      <div className='combobox-shell'>
        <span className='input-icon' aria-hidden='true'>⌖</span>
        <input
          id={inputId}
          type='search'
          role='combobox'
          autoComplete='off'
          autoCapitalize='none'
          spellCheck={false}
          value={query}
          autoFocus={autoFocus}
          aria-autocomplete='list'
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={open && options[activeIndex]
            ? `${inputId}-option-${activeIndex}`
            : undefined}
          aria-describedby={hint ? hintId : undefined}
          placeholder={includeCountries ? t('searchPlace') : t('searchTimeZone')}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
            setCityLimit(12);
            setSelectedCountryCode('');
            if (value && event.target.value !== value) {
              userClearedSelection.current = true;
              onChange('');
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              if (options.length > 0) {
                setActiveIndex((current) => Math.min(current + 1, options.length - 1));
              }
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === 'Enter' && open && options[activeIndex]) {
              event.preventDefault();
              chooseOption(options[activeIndex]);
            } else if (event.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
      </div>
      {open && (
        <ul className='combobox-list' id={listId} role='listbox'>
          {options.length === 0 && <li className='empty-option'>{t('noResults')}</li>}
          {options.map((option, index) => (
            <li
              id={`${inputId}-option-${index}`}
              key={option.key}
              role='option'
              aria-label={`${option.title} ${option.subtitle}`}
              aria-selected={option.kind === 'place' && option.timeZone === value}
              className={[
                index === activeIndex ? 'active' : '',
                option.kind === 'location' ? 'location-option' : '',
              ].filter(Boolean).join(' ')}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseOption(option)}
            >
              <span>
                <strong>{option.title}</strong>
                <small>{option.subtitle}</small>
              </span>
              {option.kind === 'place' && option.timeZone === value && (
                <span aria-hidden='true'>✓</span>
              )}
            </li>
          ))}
          {cityTotal > cityResults.length && (
            <li role='presentation' className='show-more-option'>
              <button
                type='button'
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setCityLimit((current) => current + 24)}
              >
                {t('showMoreCities')}
              </button>
            </li>
          )}
        </ul>
      )}
      {selectedCountry && selectedCountry.timeZones.length > 1 && (
        <p className='status country-refine'>{t('countryRefine')}</p>
      )}
      {selectedCountry?.requiresManualTimeZone && (
        <p className='status warning'>{t('manualCountryZone')}</p>
      )}
    </div>
  );
}
