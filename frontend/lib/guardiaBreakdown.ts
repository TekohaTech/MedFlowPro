/**
 * Guardia rate resolution + medical-day hour classification.
 *
 * Shared by the amount-preview effect and the day-type breakdown in
 * useShiftForm so both derivations can never disagree on rates.
 *
 * Rate fallback chain (mirrors backend actividades.py):
 *  - semanaRate  = guardia_semana_rate ?? guardia_rate ?? fallbackRate
 *  - findeRate   = guardia_finde_rate ?? semanaRate
 *  - feriadoRate = guardia_feriado_rate (no fallback; null when unset)
 *
 * `fallbackRate` is the manual $/Hora typed in the form; it may be null
 * (breakdown listing) or a number (amount preview). Null rates are preserved:
 * callers decide how to render/use them (a null feriadoRate also disables the
 * feriado bucket in the hour classification via the holidaysAsFeriado flag).
 */

import { classifyGuardiaHours, type GuardiaHoursSplit } from './guardiaHours';
import type { Institution } from '../types';

export interface GuardiaBreakdown {
  split: GuardiaHoursSplit;
  semanaRate: number | null;
  findeRate: number | null;
  feriadoRate: number | null;
}

export function computeGuardiaBreakdown(
  start: Date,
  end: Date,
  institution: Institution | null,
  fallbackRate: number | null,
): GuardiaBreakdown {
  const semanaRate = institution?.guardia_semana_rate ?? institution?.guardia_rate ?? fallbackRate;
  const findeRate = institution?.guardia_finde_rate ?? semanaRate;
  const feriadoRate = institution?.guardia_feriado_rate ?? null;
  const split = classifyGuardiaHours(start, end, feriadoRate != null);
  return { split, semanaRate, findeRate, feriadoRate };
}
