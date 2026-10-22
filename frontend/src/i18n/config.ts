export const locales = ["fr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function localeFromPathname(pathname: string): Locale {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : defaultLocale;
}

export function stripLocale(pathname: string): string {
  const segment = pathname.split("/")[1];
  if (!isLocale(segment)) return pathname || "/";
  const stripped = pathname.slice(segment.length + 1);
  return stripped || "/";
}

export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const path = stripLocale(href);
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
