/**
 * Medical-day hour classification for guardias.
 *
 * Medical day = 08:00 → 08:00 of the next day. Hours between 00:00 and 08:00
 * belong to the PREVIOUS day's medical day. Every hour of a guardia is
 * classified by the medical day where it falls: feriado (national holiday,
 * max priority), finde (Sat/Sun) or semana (Mon-Fri).
 *
 * Mirror of backend classify_guardia_hours (backend/app/routers/actividades.py)
 * — keep both in sync.
 */

import { esFeriado } from './feriados';

export interface GuardiaHoursSplit {
  weekdayHours: number;
  weekendHours: number;
  feriadoHours: number;
}

/** Calendar date of the medical day (08:00 → 08:00) containing the hour. */
function medicalDay(hourTs: Date): Date {
  const day = new Date(hourTs.getFullYear(), hourTs.getMonth(), hourTs.getDate());
  if (hourTs.getHours() < 8) {
    day.setDate(day.getDate() - 1);
  }
  return day;
}

/**
 * Classify each hour of the guardia range by medical day.
 *
 * With holidaysAsFeriado=false (no feriado rate configured) holiday hours fall
 * back into their underlying weekday/weekend bucket, matching the backend.
 */
export function classifyGuardiaHours(
  start: Date,
  end: Date,
  holidaysAsFeriado = true,
): GuardiaHoursSplit {
  const split: GuardiaHoursSplit = { weekdayHours: 0, weekendHours: 0, feriadoHours: 0 };
  const cursor = new Date(start);
  while (cursor < end) {
    const day = medicalDay(cursor);
    if (esFeriado(day) && holidaysAsFeriado) {
      split.feriadoHours += 1;
    } else if (day.getDay() === 0 || day.getDay() === 6) {
      split.weekendHours += 1;
    } else {
      split.weekdayHours += 1;
    }
    cursor.setHours(cursor.getHours() + 1);
  }
  return split;
}
