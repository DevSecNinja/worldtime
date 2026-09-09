import type { Locale } from '../domain/event';
import { en } from './en';
import { nl } from './nl';

const resources = { en, nl };

export type MessageKey = keyof typeof en;

export function browserLocale(): Locale {
  const preferred = navigator.languages
    .map((language) => language.toLowerCase())
    .find((language) => language.startsWith('en') || language.startsWith('nl'));
  return preferred?.startsWith('nl') ? 'nl' : 'en';
}

export function translate(locale: Locale, key: MessageKey): string {
  return resources[locale][key];
}
