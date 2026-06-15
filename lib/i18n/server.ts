/**
 * Server-side locale resolution.
 *
 * Reads the locale cookie via `next/headers` so Server Components and route
 * metadata render in the visitor's chosen language with no flash. Defaults to
 * NL for new visitors. This module is server-only (it imports `next/headers`);
 * client components receive the locale + dictionary through `I18nProvider`.
 */
import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n/config";
import { DICTIONARIES, type Dictionary } from "@/lib/i18n/dictionaries";

/** The visitor's resolved UI locale (cookie → default NL). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

/** The resolved locale's dictionary. */
export async function getDictionary(): Promise<Dictionary> {
  return DICTIONARIES[await getLocale()];
}

/** The dictionary for an already-resolved locale (no cookie read). */
export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
