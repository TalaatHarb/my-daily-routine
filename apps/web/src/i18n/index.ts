import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import ar from './locales/ar.json'
import en from './locales/en.json'
import type { Locale } from '../types/api'

export const SUPPORTED_LANGUAGES: readonly Locale[] = ['en', 'ar']
export const LANGUAGE_STORAGE_KEY = 'mdr.lang'

export function directionOf(language: string): 'rtl' | 'ltr' {
  return language.startsWith('ar') ? 'rtl' : 'ltr'
}

function applyDocumentLanguage(language: string) {
  const root = document.documentElement
  root.lang = language
  root.dir = directionOf(language)
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as string[],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  })

applyDocumentLanguage(i18n.resolvedLanguage ?? 'en')
i18n.on('languageChanged', applyDocumentLanguage)

export function currentLanguage(): Locale {
  return (i18n.resolvedLanguage as Locale | undefined) === 'ar' ? 'ar' : 'en'
}

export default i18n
