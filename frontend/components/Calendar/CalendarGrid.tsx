import { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, type Locale,
} from 'date-fns';
import { Transaction, PaymentStatus, ShiftType } from '../../types';
import { cn } from '../../lib/utils';
import { getShiftsForDay, isCoverageDay } from './calendarUtils';

interface CalendarGridProps {
  transactions: Transaction[];
  currentDate: Date;
  selectedDay: Date;
  locale: Locale;
  t: Record<string, string>;
  onDayClick: (day: Date) => void;
}

export function CalendarGrid({
  transactions, currentDate, selectedDay, locale, t, onDayClick,
}: CalendarGridProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => eachDayOfInterval({ start: startDate, end: endDate }), [startDate, endDate]);

  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; day: Date; shifts: Transaction[] } | null>(null);

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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
          const shifts = getShiftsForDay(day, transactions);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isSelected = isSameDay(day, selectedDay);
          const isActuallyToday = isToday(day);
          const dayTotal = shifts.reduce((s, t) => s + t.amount, 0);
          const multiDayShifts = shifts.filter(s => s.endDate && s.endDate !== s.date && s.type === ShiftType.ACTIVE);
          const hasCoverage = multiDayShifts.some(s => isCoverageDay(day, s));

          return (
            <div
              key={`day-${dayIdx}`}
              onClick={() => onDayClick(day)}
              onMouseMove={(e) => shifts.length > 0 && setHoverInfo({ x: e.clientX, y: e.clientY, day, shifts })}
              onMouseLeave={() => setHoverInfo(null)}
              className={cn(
                "min-h-[90px] lg:min-h-[120px] p-2 lg:p-3 transition-all cursor-pointer relative flex flex-col",
                !isCurrentMonth && "bg-slate-50/30 dark:bg-slate-900/10 opacity-30",
                isSelected ? "bg-blue-50/50 dark:bg-blue-900/20 z-10" : "hover:bg-slate-50/80 dark:hover:bg-slate-900/50",
                hasCoverage && "bg-blue-50/30 dark:bg-blue-900/10"
              )}
            >
              {hasCoverage && (
                <div className="absolute inset-x-1 top-7 bottom-1 bg-blue-200/40 dark:bg-blue-700/20 rounded-lg pointer-events-none" />
              )}
              <div className="flex justify-between items-start mb-1 relative">
                <span className={cn(
                  "text-xs font-black w-7 h-7 flex items-center justify-center rounded-2xl transition-all shrink-0",
                  isActuallyToday ? "bg-red-500 text-white shadow-lg shadow-red-200" :
                  isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110" :
                  "text-slate-900 dark:text-white"
                )}>
                  {format(day, 'd')}
                </span>
                {shifts.length > 0 && (
                  <div className="flex -space-x-1">
                    {shifts.slice(0, 3).map((shift, i) => {
                      const dotColor = shift.type === ShiftType.EXTRA
                        ? "bg-amber-500"
                        : shift.type === ShiftType.CONSULTATION
                          ? "bg-purple-500"
                          : shift.type === ShiftType.PASSIVE
                            ? "bg-green-500"
                            : "bg-blue-500";
                      return (
                        <div key={i} className={cn("w-1.5 h-1.5 rounded-full border border-white dark:border-slate-800", dotColor)} />
                      );
                    })}
                  </div>
                )}
              </div>

              {dayTotal > 0 && (
                <p className="text-[8px] font-black text-slate-900 dark:text-white mt-0.5 truncate relative">
                  ${(dayTotal / 1000).toFixed(0)}k
                </p>
              )}

              {multiDayShifts.slice(0, 1).map(s => (
                <div key={`cov-${s.id}`} className="text-[6px] font-black text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-900/40 px-1 rounded mt-0.5 truncate relative text-center">
                  {s.startTime || '08:00'} → {s.endTime || '08:00'}
                </div>
              ))}

              {/* Desktop: institution once + type-colored dots */}
              {shifts.length > 0 && (
                <div className="hidden lg:block space-y-0.5 mt-auto relative">
                  <div className="flex items-center gap-1 text-[7px] font-black text-slate-600 dark:text-slate-300 leading-tight">
                    <span className="truncate">{shifts[0].institution}</span>
                    {Array.from(new Set(shifts.map(s => s.type))).map((type, i) => {
                      const dotColor = type === ShiftType.EXTRA
                        ? "bg-amber-500"
                        : type === ShiftType.CONSULTATION
                          ? "bg-purple-500"
                          : type === ShiftType.PASSIVE
                            ? "bg-green-500"
                            : "bg-blue-500";
                      return <div key={i} className={cn("w-1 h-1 rounded-full shrink-0", dotColor)} />;
                    })}
                  </div>
                </div>
              )}

              {/* Mobile: count badge */}
              <div className="lg:hidden flex justify-center mt-auto">
                {shifts.length > 0 && <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 rounded-md">{shifts.length}</span>}
              </div>

            </div>
          );
        })}
      </div>

      {/* Floating tooltip — sigue al cursor en desktop */}
      {hoverInfo && (
        <div
          className="hidden lg:block fixed pointer-events-none z-[60] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 min-w-[220px] max-w-[260px]"
          style={{
            left: Math.min(hoverInfo.x + 16, window.innerWidth - 280),
            top: hoverInfo.y - 10 > 10 ? hoverInfo.y - 10 : hoverInfo.y + 20,
          }}
        >
          {(() => {
            const tl: Record<string, string> = {
              [ShiftType.ACTIVE]: 'Guardia',
              [ShiftType.CONSULTATION]: 'Proced.',
              [ShiftType.EXTRA]: 'Extra',
              [ShiftType.PASSIVE]: 'Interc.',
            };
            const dot = (t: ShiftType) => t === ShiftType.EXTRA ? "bg-amber-500"
              : t === ShiftType.CONSULTATION ? "bg-purple-500"
              : t === ShiftType.PASSIVE ? "bg-green-500"
              : "bg-blue-500";
            const groups = new Map<string, Transaction[]>();
            hoverInfo.shifts.forEach(s => {
              if (!groups.has(s.institution)) groups.set(s.institution, []);
              groups.get(s.institution)!.push(s);
            });
            return Array.from(groups.entries()).map(([inst, items], gi) => (
              <div key={inst}>
                {gi > 0 && <div className="my-1.5 border-t border-slate-100 dark:border-slate-700" />}
                <p className="text-[9px] font-black text-slate-900 dark:text-white truncate mb-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-700">
                  {inst}
                </p>
                <div className="space-y-1">
                  {items.map(s => (
                    <div key={s.id} className="flex items-center gap-1.5 text-[8px]">
                      <div className={cn("w-2 h-2 rounded-full shrink-0", dot(s.type))} />
                      <span className="font-bold text-slate-500 dark:text-slate-400 w-[58px] shrink-0">{tl[s.type]}</span>
                      {s.startTime && (
                        <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0">{s.startTime}–{s.endTime || '?'}</span>
                      )}
                      <span className={cn(
                        "font-black ml-auto",
                        s.status === PaymentStatus.PAID ? "text-green-600" : "text-slate-900 dark:text-white"
                      )}>
                        ${s.amount.toLocaleString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}
