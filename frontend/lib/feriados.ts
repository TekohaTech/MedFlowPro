/**
 * Feriados argentinos — inamovibles y trasladables (días efectivos de descanso),
 * con el nombre oficial de cada feriado para mostrarlo en la UI.
 *
 * Mantener sincronizado con backend/app/data/feriados.py — actualizar una vez al año.
 */

// Feriados nacionales 2026 (ISO YYYY-MM-DD → nombre oficial) — inamovibles y trasladados.
export const FERIADOS_ARGENTINA_2026: ReadonlyMap<string, string> = new Map([
  ['2026-01-01', 'Año Nuevo'],
  ['2026-02-16', 'Carnaval'],
  ['2026-02-17', 'Carnaval'],
  ['2026-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia'],
  ['2026-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas'],
  ['2026-04-03', 'Viernes Santo'],
  ['2026-05-01', 'Día del Trabajador'],
  ['2026-05-25', 'Día de la Revolución de Mayo'],
  ['2026-06-15', 'Paso a la Inmortalidad del General Güemes'],
  ['2026-06-20', 'Paso a la Inmortalidad del General Manuel Belgrano'],
  ['2026-07-09', 'Día de la Independencia'],
  ['2026-08-17', 'Paso a la Inmortalidad del General José de San Martín'],
  ['2026-10-12', 'Día del Respeto a la Diversidad Cultural'],
  ['2026-11-23', 'Día de la Soberanía Nacional'],
  ['2026-12-08', 'Inmaculada Concepción de María'],
  ['2026-12-25', 'Navidad'],
]);

/** Normaliza string ISO o Date a 'YYYY-MM-DD' usando componentes locales (no UTC). */
function toISODate(fecha: string | Date): string {
  if (typeof fecha === 'string') return fecha.slice(0, 10);
  // Usar componentes locales (no toISOString, que es UTC y puede correr la fecha
  // al día anterior antes de ~03:00 ARG).
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

/** Devuelve true si la fecha (string ISO o Date) es un feriado nacional argentino. */
export function esFeriado(fecha: string | Date): boolean {
  return FERIADOS_ARGENTINA_2026.has(toISODate(fecha));
}

/** Devuelve el nombre oficial del feriado (string ISO o Date), o null si no es feriado. */
export function holidayName(fecha: string | Date): string | null {
  return FERIADOS_ARGENTINA_2026.get(toISODate(fecha)) ?? null;
}

/** Devuelve true si la fecha local (Date) cae en un feriado nacional argentino. */
export function isHolidayDay(fecha: Date): boolean {
  return esFeriado(fecha);
}
