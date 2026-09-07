import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { useAppState } from '../../app/app-state';
import { type CitySearchResult, searchCities } from '../../domain/city-search';
import { countryNamesForZone, searchTimeZones } from '../../domain/timezone-search';

interface TimeZonePickerProps {
  value: string;
  onChange: (timeZone: string) => void;
  label?: string;
  hint?: string;
  id?: string;
  autoFocus?: boolean;
}

export function TimeZonePicker({
  value,
  onChange,
  label,
  hint,
  id,
  autoFocus = false,
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
  const userClearedSelection = useRef(false);
  const zoneResults = useMemo(() => searchTimeZones(query, 8), [query]);
  const options = useMemo(() => {
    return [
      ...zoneResults.map((zone) => ({
        key: `zone-${zone.id}`,
        timeZone: zone.id,
        title: zone.id,
        subtitle: [
          zone.cities.slice(0, 3).join(', '),
          countryNamesForZone(zone, locale),
        ].filter(Boolean).join(' · '),
      })),
      ...cityResults
        .map((city) => ({
          key: `city-${city.id}`,
          timeZone: city.timeZone,
          title: `${city.name}, ${city.countryName}`,
          subtitle: city.timeZone,
        })),
    ];
  }, [cityResults, locale, zoneResults]);

  useEffect(() => {
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

  const choose = (timeZone: string) => {
    onChange(timeZone);
    setQuery(timeZone);
    setOpen(false);
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
          placeholder={t('searchTimeZone')}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
            setCityLimit(12);
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
              choose(options[activeIndex].timeZone);
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
              aria-selected={option.timeZone === value}
              className={index === activeIndex ? 'active' : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option.timeZone)}
            >
              <span>
                <strong>{option.title}</strong>
                <small>{option.subtitle}</small>
              </span>
              {option.timeZone === value && <span aria-hidden='true'>✓</span>}
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
    </div>
  );
}
