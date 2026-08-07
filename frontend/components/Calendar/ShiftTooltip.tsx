import { PaymentStatus, ShiftType, Transaction } from '../../types';
import { cn } from '../../lib/utils';
import { isHolidayDay, holidayName } from '../../lib/feriados';

export interface HoverInfo {
  x: number;
  y: number;
  day: Date;
  shifts: Transaction[];
}

interface ShiftTooltipProps {
  hoverInfo: HoverInfo;
  t: Record<string, string>;
}

export function ShiftTooltip({ hoverInfo, t }: ShiftTooltipProps) {
  const tl: Record<string, string> = {
    [ShiftType.ACTIVE]: 'Guardia',
    [ShiftType.CONSULTATION]: 'Proced.',
    [ShiftType.EXTRA]: 'Extra',
    [ShiftType.PASSIVE]: 'Interc.',
  };
  const dot = (type: ShiftType) => type === ShiftType.EXTRA ? "bg-amber-500"
    : type === ShiftType.CONSULTATION ? "bg-purple-500"
    : type === ShiftType.PASSIVE ? "bg-green-500"
    : "bg-blue-500";
  const groups = new Map<string, Transaction[]>();
  hoverInfo.shifts.forEach(s => {
    if (!groups.has(s.institution)) groups.set(s.institution, []);
    groups.get(s.institution)!.push(s);
  });

  return (
    <div
      className="hidden lg:block fixed pointer-events-none z-[60] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 min-w-[220px] max-w-[260px]"
      style={{
        left: Math.min(hoverInfo.x + 16, window.innerWidth - 280),
        top: hoverInfo.y - 10 > 10 ? hoverInfo.y - 10 : hoverInfo.y + 20,
      }}
    >
      {isHolidayDay(hoverInfo.day) && (
        <p className="text-[9px] font-black text-amber-700 dark:text-amber-300 mb-1.5 pb-1.5 border-b border-amber-100 dark:border-amber-900/40 truncate">
          {holidayName(hoverInfo.day) ?? t.feriadoNacional}
        </p>
      )}
      {Array.from(groups.entries()).map(([inst, items], gi) => (
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
      ))}
    </div>
  );
}
