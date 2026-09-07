import type { Locale } from '../domain/event';
import { en } from './en';
import { nl } from './nl';

const resources = { en, nl };

export type MessageKey = keyof typeof en;

export function browserLocale(): Locale {
  return navigator.languages.some((language) => language.toLowerCase().startsWith('nl'))
    ? 'nl'
    : 'en';
}

export function translate(locale: Locale, key: MessageKey): string {
  return resources[locale][key];
}
