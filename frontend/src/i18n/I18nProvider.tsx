"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { getMessage, getMessageArray } from "./messages";

type I18nValue = {
  locale: Locale;
  t: (key: string) => string;
  tArray: (key: string) => string[];
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(
    () => ({
      locale,
      t: (key: string) => getMessage(locale, key),
      tArray: (key: string) => getMessageArray(locale, key),
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}
