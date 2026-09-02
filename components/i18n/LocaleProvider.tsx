"use client";

import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Locale } from "@/lib/i18n/locales";

import type { LocaleSelectorLabels } from "./LocaleSelector";

type LocaleContextValue = {
  labels: LocaleSelectorLabels;
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale,
  labels,
}: {
  children: ReactNode;
  initialLocale: Locale;
  labels: LocaleSelectorLabels;
}) {
  const [locale, setLocale] = useState(initialLocale);

  useEffect(() => {
    setLocale(initialLocale);
  }, [initialLocale]);

  const value = useMemo(
    () => ({ labels, locale, setLocale }),
    [labels, locale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocaleContext() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocaleContext must be used inside LocaleProvider.");
  }

  return context;
}
