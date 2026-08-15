import { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, type Locale,
} from 'date-fns';
import { Transaction, Institution, ShiftType } from '../../types';
import { cn } from '../../lib/utils';
import { isHolidayDay, holidayName } from '../../lib/feriados';
import { getInstitutionColorMap } from '../../lib/institutionColors';
import { getShiftsForDay, isShiftStart } from './calendarUtils';
import { DurationLines, type DurationLineSpec } from './DurationLines';
import { ShiftTooltip, type HoverInfo } from './ShiftTooltip';

interface CalendarGridProps {
  transactions: Transaction[];
  institutions: Institution[];
  currentDate: Date;
  selectedDay: Date;
  locale: Locale;
  t: Record<string, string>;
  onDayClick: (day: Date) => void;
}

// The calendar shows guardias, not sums: each covering institution renders a
// duration line (dot + amount + segment, no cap); coverage days show only the
// line's segment; a guardia ending the same day another STARTS renders TWO
// lines (end marker line + dot line). Mobile shows a count badge of the
// guardias starting today.

interface DayLine {
  institution: string;
  startsToday: boolean;
  endsToday: boolean;
  /** Identity for slot persistence: the guardia with the MIN start date in
      that line — a continuing guardia keeps the SAME key across days. */
  leaderId: string;
}

// Shared per-day line builder, used by BOTH the slot simulation (useMemo) and
// the day render — the visual order can never desync from the slot model.
// lineKey = `${institution}::${leaderId}`: the split line of the ENDING
// guardia keeps the key it had the day before (same leader), so its slot
// persists; the STARTING guardia is a different leader → takes the first free
// slot. Non-split days keep ONE line whose leader is the earliest-starting
// ACTIVE guardia covering the day.
function buildDayLines(dayStr: string, shifts: Transaction[]): DayLine[] {
  const activeShifts = shifts.filter(s => s.type === ShiftType.ACTIVE);
  const startTxs = activeShifts.filter(s => isShiftStart(dayStr, s)); // starts today
  const endTxs = activeShifts.filter(s => s.endDate === dayStr);      // ends today
  // Ordering: EARLIEST start date of the ACTIVE guardia covering this day, so
  // a guardia starting mid-way through another's duration renders BELOW the
  // ongoing one — consistently across every day they co-cover.
  const minStartByInstitution = new Map<string, string>();
  for (const s of activeShifts) {
    const cur = minStartByInstitution.get(s.institution);
    if (!cur || s.date < cur) minStartByInstitution.set(s.institution, s.date);
  }
  const ordered = [...minStartByInstitution.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([institution]) => institution);
  const leader = (txs: Transaction[]) =>
    [...txs].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))[0];
  const lines: DayLine[] = [];
  for (const institution of ordered) {
    const st = startTxs.filter(s => s.institution === institution);
    const et = endTxs.filter(s => s.institution === institution);
    // A guardia that ends today WITHOUT starting today (multi-day reaching its
    // end)…
    const multiEnd = et.some(s => !isShiftStart(dayStr, s));
    // …or starts today WITHOUT ending today (continues tomorrow).
    const multiStart = st.some(s => s.endDate !== dayStr);
    // Two DIFFERENT guardias touch today (one ends, another starts) → split
    // into TWO lines so the fusion never looks like a 1-day guardia.
    const split = (multiEnd && st.length > 0) || (multiStart && et.length > 0);
    if (split) {
      // The ENDING line (A): segment + end marker, NO dot.
      lines.push({ institution, startsToday: false, endsToday: true, leaderId: leader(et).id });
      // The STARTING line (B): dot (+ amount); end marker ONLY when B itself
      // is a 1-day guardia.
      lines.push({ institution, startsToday: true, endsToday: st.some(s => s.endDate === dayStr), leaderId: leader(st).id });
    } else {
      const active = activeShifts.filter(s => s.institution === institution);
      lines.push({ institution, startsToday: st.length > 0, endsToday: et.length > 0, leaderId: leader(active).id });
    }
  }
  return lines;
}

export function CalendarGrid({
  transactions, institutions, currentDate, selectedDay, locale, t, onDayClick,
}: CalendarGridProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);
  const colorMap = useMemo(() => getInstitutionColorMap(institutions), [institutions]);

  // Persistent line slots: simulate the month day-by-day with the SAME builder
  // used by the render. Existing lines re-occupy their slot every day; a NEW
  // line takes the FIRST FREE slot (below everything active that day). Lines
  // that end simply stop occupying their slot — existing lines NEVER move.
  const lineSlots = useMemo(() => {
    const slots = new Map<string, number>();
    for (const day of calendarDays) {
      const dayStr = format(day, 'yyyy-MM-dd');
      const lines = buildDayLines(dayStr, getShiftsForDay(day, transactions));
      const occupied = new Set<number>();
      for (const line of lines) {
        const s = slots.get(`${line.institution}::${line.leaderId}`);
        if (s !== undefined) occupied.add(s);
      }
      for (const line of lines) {
        const key = `${line.institution}::${line.leaderId}`;
        if (!slots.has(key)) {
          let s = 1;
          while (occupied.has(s)) s++;
          slots.set(key, s);
          occupied.add(s);
        }
      }
    }
    return slots;
  }, [calendarDays, transactions]);

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  const dayNames = [t.diaDom, t.diaLun, t.diaMar, t.diaMie, t.diaJue, t.diaVie, t.diaSab];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-300 dark:border-slate-700 shadow-2xl shadow-slate-200/40 dark:shadow-none overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
        {dayNames.map((dayName, dIdx) => (
          <div key={`header-${dIdx}`} className="py-3 lg:py-4 text-center">
            <span className="text-[9px] lg:text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {dayName}
            </span>
          </div>
        ))}
      </div>

      {/* Grid "lines" are the container's background showing through a 1px gap
          BETWEEN cells (gap-px), NOT borders ON each cell (divide-*) — so the
          duration lines (z-indexed) paint OVER the grid lines, not under the
          neighbor cell's border. Cells paint their own opaque background. */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700">
        {calendarDays.map((day, dayIdx) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const shifts = getShiftsForDay(day, transactions);
          const startShifts = shifts.filter(s => isShiftStart(dayStr, s));
          // Mobile count badge: number of GUARDIAS (ACTIVE) starting today.
          const startCount = startShifts.filter(s => s.type === ShiftType.ACTIVE).length;
          // First ACTIVE start transaction per institution — feeds the desktop
          // amount rendered inside the duration line (for a split day it is
          // the STARTING guardia, correct).
          const startShiftByInstitution = new Map<string, Transaction>();
          for (const s of startShifts) {
            if (s.type !== ShiftType.ACTIVE) continue;
            if (!startShiftByInstitution.has(s.institution)) startShiftByInstitution.set(s.institution, s);
          }
          // Duration lines: same visual builder as the slot simulation — each
          // line carries its persistent slot (fallback: visual order) and is
          // rendered sorted by slot, so a line keeps its row for its whole
          // life instead of jumping up when the lines above it end.
          const lines = buildDayLines(dayStr, shifts);
          const renderedLines: DurationLineSpec[] = lines
            .map((line, index) => ({
              ...line,
              slot: lineSlots.get(`${line.institution}::${line.leaderId}`) ?? index + 1,
            }))
            .sort((a, b) => a.slot - b.slot);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isSelected = isSameDay(day, selectedDay);
          const isActuallyToday = isToday(day);
          const isHoliday = isCurrentMonth && isHolidayDay(day);

          return (
            <div
              key={`day-${dayIdx}`}
              onClick={() => onDayClick(day)}
              onMouseMove={(e) => shifts.length > 0 && setHoverInfo({ x: e.clientX, y: e.clientY, day, shifts })}
              onMouseLeave={() => setHoverInfo(null)}
              className={cn(
                "bg-white dark:bg-slate-800 min-h-[90px] lg:min-h-[120px] p-2 lg:p-3 transition-all cursor-pointer relative flex flex-col",
                !isCurrentMonth && "bg-slate-50/30 dark:bg-slate-900/10 opacity-30",
                isHoliday && "bg-amber-50/60 dark:bg-amber-900/15",
                isSelected ? "bg-blue-50/50 dark:bg-blue-900/20 z-10" : "hover:bg-slate-50/80 dark:hover:bg-slate-900/50"
              )}
            >
              <div className="flex justify-between items-start mb-1 relative">
                <span className={cn(
                  "text-xs font-black w-7 h-7 flex items-center justify-center rounded-2xl transition-all shrink-0",
                  isActuallyToday ? "bg-red-500 text-white shadow-lg shadow-red-200" :
                  isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110" :
                  "text-slate-900 dark:text-white"
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              <DurationLines
                lines={renderedLines}
                colorMap={colorMap}
                showAmounts
                startShiftByInstitution={startShiftByInstitution}
              />

              {isHoliday && (
                <span className="relative self-start max-w-full truncate text-[6px] lg:text-[7px] font-black text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/30 px-1 rounded mt-0.5">
                  {holidayName(day) ?? t.feriado}
                </span>
              )}

              {/* Mobile: compact badge with the COUNT of guardias starting
                  today — amounts live in the day panel. Coverage-only days
                  rely on the duration line, no badge. */}
              {startCount > 0 && (
                <div className="lg:hidden flex items-center justify-center gap-1 mt-auto">
                  <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 rounded-md shrink-0">
                    {startCount}
                  </span>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Floating tooltip — sigue al cursor en desktop */}
      {hoverInfo && <ShiftTooltip hoverInfo={hoverInfo} t={t} institutions={institutions} />}
    </div>
  );
}
