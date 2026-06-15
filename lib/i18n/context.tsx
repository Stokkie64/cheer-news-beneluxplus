"use client";

/**
 * Client-side i18n: a context that carries the active locale + dictionary down
 * to Client Components. The Server root layout resolves the locale (cookie) and
 * renders <I18nProvider locale=…> so client and server agree — no hydration
 * mismatch. Client components call `useI18n()` to read `{ t, locale }`.
 *
 * Dictionaries are looked up from the bundled `DICTIONARIES` map by locale, so
 * only the locale string crosses the server→client boundary (not the whole
 * dictionary object), keeping the serialized payload tiny.
 */
import * as React from "react";
import type { Locale } from "@/lib/i18n/config";
import { DICTIONARIES, type Dictionary } from "@/lib/i18n/dictionaries";

interface I18nValue {
  locale: Locale;
  t: Dictionary;
}

const I18nContext = React.createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = React.useMemo<I18nValue>(
    () => ({ locale, t: DICTIONARIES[locale] }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Read the active locale + dictionary inside a Client Component. */
export function useI18n(): I18nValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
