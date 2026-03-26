'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'fr' | 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr');

  const t = (key: string): string => {
    // Simple translation function
    const translations: Record<string, Record<Language, string>> = {
      'dashboard.title': { fr: 'Tableau de bord', en: 'Dashboard', ar: 'لوحة القيادة' },
      'clients.title': { fr: 'Clients', en: 'Clients', ar: 'العملاء' },
      'debts.title': { fr: 'Créances', en: 'Debts', ar: 'الديون' },
    };
    
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
