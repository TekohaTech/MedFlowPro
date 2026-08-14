import { Institution } from '../types';

/**
 * 12 distinct hex colors, readable on both light and dark backgrounds.
 * Shared by the institution color picker and the calendar components.
 */
export const INSTITUTION_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#d946ef', // fuchsia
] as const;

/**
 * Stable name → color map used by calendar components. Institutions with a
 * stored color keep it; legacy institutions without one get the first palette
 * color not yet taken, assigned deterministically in list order.
 */
export function getInstitutionColorMap(
  institutions: Institution[],
): Map<string, string> {
  const map = new Map<string, string>();
  const used = new Set<string>();

  // First pass: stored colors win.
  for (const inst of institutions) {
    if (inst.color) {
      map.set(inst.name, inst.color);
      used.add(inst.color);
    }
  }
  // Second pass: auto-assign a free palette color to legacy institutions.
  for (const inst of institutions) {
    if (inst.color || map.has(inst.name)) continue;
    const free = INSTITUTION_COLORS.find(c => !used.has(c));
    if (free) {
      map.set(inst.name, free);
      used.add(free);
    }
  }
  return map;
}
