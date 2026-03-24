"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Locale, defaultLocale, localeNames, localeFlags } from "./config";
import { getTranslation } from "./translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  localeName: string;
  localeFlag: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getStoredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  const saved = localStorage.getItem("locale") as Locale;
  if (saved === "fr" || saved === "en") return saved;
  return defaultLocale;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getStoredLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", newLocale);
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = getTranslation(locale);
    let text = translation[key] || key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{{${k}}}`, String(v));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        t,
        localeName: localeNames[locale],
        localeFlag: localeFlags[locale],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export { localeNames, localeFlags };
