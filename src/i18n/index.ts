import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import mr from './locales/mr.json';
import { domTranslator } from './domTranslator';

export const SUPPORTED_LANGUAGES = ['en', 'mr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  en: { translation: en },
  mr: { translation: mr },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    returnEmptyString: false,
  });

const syncDomTranslator = (language: string) => {
  if (typeof document === 'undefined') return;
  const code = (language || 'en').split('-')[0] ?? 'en';
  document.documentElement.setAttribute('lang', code);
  if (code === 'mr') {
    domTranslator.start();
  } else {
    domTranslator.stop();
  }
};

if (typeof document !== 'undefined') {
  // Activate on initial load (after React has mounted enough to have body).
  const init = () => syncDomTranslator(i18n.language);
  if (i18n.isInitialized) {
    init();
  } else {
    i18n.on('initialized', init);
  }
  i18n.on('languageChanged', syncDomTranslator);
}

export default i18n;
