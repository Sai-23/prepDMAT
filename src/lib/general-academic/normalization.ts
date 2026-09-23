import type { JsonValue } from "@/lib/generation/types";

export function normalizeInlineText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeLongText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeComparableText(value: string) {
  return normalizeInlineText(value).toLocaleLowerCase("en");
}

export function normalizeFingerprintText(value: string) {
  return normalizeLongText(value).replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function normalizeJsonStrings(value: JsonValue): JsonValue {
  if (typeof value === "string") return normalizeLongText(value);
  if (Array.isArray(value)) return value.map(normalizeJsonStrings);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, normalizeJsonStrings(child)]),
    );
  }
  return value;
}
