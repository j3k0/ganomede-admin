import { format, formatDistanceToNow } from "date-fns";

export function formatDate(date: string | number | Date): string {
  return format(new Date(date), "yyyy-MM-dd HH:mm");
}

export function formatDateRelative(date: string | number | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function passwordSuggestion(): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 2; i++) pw += digits[Math.floor(Math.random() * digits.length)];
  return pw;
}

/**
 * Strip common prefixes from item/pack identifiers for display.
 */
export function stripPrefix(value: string, prefix = "com.triominos."): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

/**
 * Group array items by a key function.
 */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    (result[key] ??= []).push(item);
  }
  return result;
}
