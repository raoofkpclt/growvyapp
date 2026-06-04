// context/LanguageContext.tsx

import { createContext, useContext, useState } from "react";


type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
}
const LanguageContext = createContext <LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: {
  children: React.ReactNode;
}) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("lang");
    return saved === "ar" ? "ar" : "en";
  });

  const changeLanguage = (lang: "en" | "ar") => {
    localStorage.setItem("lang", lang);
    setLanguage(lang);
  };

  return (
    <LanguageContext.Provider
      value={{ language, changeLanguage }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used within LanguageProvider"
    );
  }

  return context;
};