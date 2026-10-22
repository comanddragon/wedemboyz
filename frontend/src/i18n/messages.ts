import type { Locale } from "./config";
import { en } from "./locales/en";
import { fr } from "./locales/fr";

export const messages = { fr, en };
export type Messages = typeof en;

export function getRawMessage(locale: Locale, key: string): unknown {
  let value: unknown = messages[locale];
  for (const part of key.split(".")) {
    value =
      typeof value === "object" && value !== null
        ? (value as Record<string, unknown>)[part]
        : undefined;
  }
  return value;
}

export function getMessage(locale: Locale, key: string): string {
  const value = getRawMessage(locale, key);
  return typeof value === "string" ? value : key;
}

export function getMessageArray(locale: Locale, key: string): string[] {
  const value = getRawMessage(locale, key);
  return Array.isArray(value) ? (value as string[]) : [];
}
