import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enTranslation from '../locales/en/translation.json';
import hiTranslation from '../locales/hi/translation.json';
import taTranslation from '../locales/ta/translation.json';
import teTranslation from '../locales/te/translation.json';
import mlTranslation from '../locales/ml/translation.json';
import knTranslation from '../locales/kn/translation.json';
import bnTranslation from '../locales/bn/translation.json';
import mrTranslation from '../locales/mr/translation.json';

const resources = {
  en: { translation: enTranslation },
  hi: { translation: hiTranslation },
  ta: { translation: taTranslation },
  te: { translation: teTranslation },
  ml: { translation: mlTranslation },
  kn: { translation: knTranslation },
  bn: { translation: bnTranslation },
  mr: { translation: mrTranslation }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('language') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;
