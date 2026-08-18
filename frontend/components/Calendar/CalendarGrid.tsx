import { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, type Locale,
} from 'date-fns';
import { Transaction, Institution, ShiftType } from '../../types';
import { cn } from '../../lib/utils';
import { isHolidayDay, holidayName } from '../../lib/feriados';
import { getInstitutionColorMap } from '../../lib/institutionColors';
import { getShiftsForDay, isShiftStart, formatSrOnlyDurationSummary } from './calendarUtils';
import { buildDayLines, computeLineSlots, lineKey } from './durationLineSlots';
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

export function CalendarGrid({
  transactions, institutions, currentDate, selectedDay, locale, t, onDayClick,
}: CalendarGridProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);
  const colorMap = useMemo(() => getInstitutionColorMap(institutions), [institutions]);

  // Persistent line slots — pure simulation, see durationLineSlots.ts: existing
  // lines re-occupy their slot every day, new lines take the first free slot,
  // ended lines release it. Existing lines NEVER move.
  const lineSlots = useMemo(
    () => computeLineSlots(calendarDays, transactions),
    [calendarDays, transactions],
  );

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
          // Duration lines: built with the SAME builder as the slot simulation
          // (durationLineSlots.ts) — the simulation runs over the exact same
          // days and transactions, so every rendered line is GUARANTEED a slot.
          // A miss is a bug: fail loudly instead of silently collapsing to
          // visual order (which would reintroduce the line-jump corruption).
          const lines = buildDayLines(dayStr, shifts);
          const renderedLines: DurationLineSpec[] = lines
            .map((line) => {
              const slot = lineSlots.get(lineKey(line));
              if (slot === undefined) {
                throw new Error(`Missing slot for line ${lineKey(line)}`);
              }
              return { ...line, slot };
            })
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

              {/* Screen-reader-only guardia summary — the colored lines are
                  aria-hidden (decorative) and the tooltip is mouse-only, so
                  desktop SR users would lose all duration info without this. */}
              {lines.length > 0 && (
                <span className="sr-only">{formatSrOnlyDurationSummary(lines)}</span>
              )}

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
                  rely on the duration line, no badge. ARIA-HIDDEN: the bare
                  number is decorative (and an aria-label on a role-less span
                  is not reliably announced); screen-reader users get the full
                  info from the sr-only summary above — on desktop AND mobile. */}
              {startCount > 0 && (
                <div aria-hidden className="lg:hidden flex items-center justify-center gap-1 mt-auto">
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
