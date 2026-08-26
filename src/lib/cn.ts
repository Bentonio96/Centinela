/**
 * Une clases condicionales descartando los valores falsy.
 *
 * No usa `clsx` ni `tailwind-merge` a propósito: en este proyecto las clases se
 * componen por variantes cerradas, nunca sobreescribiendo una utilidad con otra
 * del mismo grupo, así que no hay conflictos que resolver.
 */

export type ClassValue = string | false | null | undefined;

export function cn(...values: readonly ClassValue[]): string {
  return values.filter((value): value is string => Boolean(value)).join(' ');
}
