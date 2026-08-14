import { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, type Locale,
} from 'date-fns';
import { Transaction, Institution, PaymentStatus, ShiftType } from '../../types';
import { cn } from '../../lib/utils';
import { isHolidayDay, holidayName } from '../../lib/feriados';
import { getInstitutionColorMap } from '../../lib/institutionColors';
import { getShiftsForDay, isShiftStart, isShiftCoverage, formatCompactAmount } from './calendarUtils';
import { ShiftDot } from './ShiftDots';
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

// The calendar shows guardias, not sums: up to 2 start-day rows per cell,
// then a "+N" overflow indicator. Coverage days only show ring dots.
const MAX_START_ROWS = 2;
const MAX_COVERAGE_RINGS = 4;

export function CalendarGrid({
  transactions, institutions, currentDate, selectedDay, locale, t, onDayClick,
}: CalendarGridProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);
  const colorMap = useMemo(() => getInstitutionColorMap(institutions), [institutions]);

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

      <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 dark:divide-slate-700">
        {calendarDays.map((day, dayIdx) => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const shifts = getShiftsForDay(day, transactions);
          const startShifts = shifts.filter(s => isShiftStart(dayStr, s));
          const coverageShifts = shifts.filter(s => isShiftCoverage(dayStr, s));
          // isShiftStart does NOT filter by type, so an extra/procedure logged
          // earlier the same day could be startShifts[0]. The mobile row must
          // show the first starting GUARDIA, not any starting item.
          const firstStartGuardia = startShifts.find(s => s.type === ShiftType.ACTIVE);
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
                "min-h-[90px] lg:min-h-[120px] p-2 lg:p-3 transition-all cursor-pointer relative flex flex-col",
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
                {/* Dots cluster (all breakpoints): filled = starts today, ring = coverage */}
                {shifts.length > 0 && (
                  <div className="flex -space-x-1">
                    {startShifts.slice(0, 2).map(s => (
                      <ShiftDot key={s.id} tx={s} colorMap={colorMap} size="xs" />
                    ))}
                    {coverageShifts.slice(0, 2).map(s => (
                      <ShiftDot key={s.id} tx={s} colorMap={colorMap} size="xs" ring />
                    ))}
                  </div>
                )}
              </div>

              {isHoliday && (
                <span className="relative self-start max-w-full truncate text-[6px] lg:text-[7px] font-black text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-900/30 px-1 rounded mt-0.5">
                  {holidayName(day) ?? t.feriado}
                </span>
              )}

              {/* Desktop: one mini-row per item STARTING today (color dot + its
                  own amount — never summed). Coverage guardias render only as
                  ring dots, no amount. */}
              <div className="hidden lg:block space-y-0.5 mt-auto relative">
                {startShifts.slice(0, MAX_START_ROWS).map(s => (
                  <div key={s.id} className="flex items-center gap-1 text-[7px] font-black leading-tight min-w-0">
                    <ShiftDot tx={s} colorMap={colorMap} size="xs" />
                    <span className={cn(
                      "truncate",
                      s.status === PaymentStatus.PAID ? "text-green-600 dark:text-green-500" : "text-slate-900 dark:text-white"
                    )}>
                      {formatCompactAmount(s.amount)}
                    </span>
                  </div>
                ))}
                {startShifts.length > MAX_START_ROWS && (
                  <div className="text-[7px] font-black text-slate-500 dark:text-slate-400">
                    +{startShifts.length - MAX_START_ROWS}
                  </div>
                )}
                {coverageShifts.length > 0 && (
                  <div className="flex items-center gap-0.5 pt-0.5">
                    {coverageShifts.slice(0, MAX_COVERAGE_RINGS).map(s => (
                      <ShiftDot key={s.id} tx={s} colorMap={colorMap} size="xs" ring />
                    ))}
                    {coverageShifts.length > MAX_COVERAGE_RINGS && (
                      <span className="text-[6px] font-black text-slate-400 dark:text-slate-500">
                        +{coverageShifts.length - MAX_COVERAGE_RINGS}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile: first starting GUARDIA as a compact row — its OWN
                  amount only (dot + amount, never a sum). Remaining items
                  collapse into a "+N" badge. Days without a starting guardia
                  keep the count badge, no amount. */}
              <div className="lg:hidden flex items-center justify-center gap-1 mt-auto">
                {firstStartGuardia ? (
                  <>
                    <div className="flex items-center gap-1 min-w-0">
                      <ShiftDot tx={firstStartGuardia} colorMap={colorMap} size="xs" />
                      <span className={cn(
                        "text-[8px] font-black leading-tight truncate",
                        firstStartGuardia.status === PaymentStatus.PAID ? "text-green-600 dark:text-green-500" : "text-slate-900 dark:text-white"
                      )}>
                        {formatCompactAmount(firstStartGuardia.amount)}
                      </span>
                    </div>
                    {shifts.length > 1 && (
                      <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 rounded-md shrink-0">
                        +{shifts.length - 1}
                      </span>
                    )}
                  </>
                ) : (
                  shifts.length > 0 && (
                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 rounded-md">
                      {shifts.length}
                    </span>
                  )
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Floating tooltip — sigue al cursor en desktop */}
      {hoverInfo && <ShiftTooltip hoverInfo={hoverInfo} t={t} institutions={institutions} />}
    </div>
  );
}
