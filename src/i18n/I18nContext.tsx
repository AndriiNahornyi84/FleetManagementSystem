import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { dictionaries, Language, TranslationKey } from './translations.js';
import { setFormatLocale } from '../utils/formatters.js';
export type { Language };

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
  locale: string;
}

const I18nContext = createContext<I18nValue | null>(null);
const storageKey = 'fleet-management-language';

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(storageKey);
    return stored === 'en' || stored === 'uk' || stored === 'sk' ? stored : 'sk';
  } catch { return 'sk'; }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  useEffect(() => {
    try { localStorage.setItem(storageKey, language); } catch { /* Storage may be disabled. */ }
    document.documentElement.lang = language;
    setFormatLocale(language === 'sk' ? 'sk-SK' : language === 'uk' ? 'uk-UA' : 'en-GB');
  }, [language]);
  const value = useMemo<I18nValue>(() => ({
    language,
    setLanguage,
    locale: language === 'sk' ? 'sk-SK' : language === 'uk' ? 'uk-UA' : 'en-GB',
    t: (key) => dictionaries[language][key] || dictionaries.sk[key]
  }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
