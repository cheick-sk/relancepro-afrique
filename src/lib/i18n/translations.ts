import { Locale, defaultLocale } from './config';
import fr from '@/locales/fr.json';
import en from '@/locales/en.json';

const translations: Record<Locale, Record<string, string>> = {
  fr,
  en,
};

export function getTranslation(locale: Locale): Record<string, string> {
  return translations[locale] || translations[defaultLocale];
}

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const translation = getTranslation(locale);
  let text = translation[key] || key;
  
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{{${k}}}`, String(v));
    });
  }
  
  return text;
}
