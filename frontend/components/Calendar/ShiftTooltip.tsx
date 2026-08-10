import { PaymentStatus, ShiftType, Transaction } from '../../types';
import { cn } from '../../lib/utils';
import { isHolidayDay, holidayName } from '../../lib/feriados';
import { formatGuardiaRange, groupShifts } from './calendarUtils';
import { typeLabel, typeStyle } from './ShiftCardHeader';
import { StatusBadge } from './StatusBadge';
import { ItemRow } from './ItemRow';

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

// Cada guardia es un grupo con SUS sub-items (misma institución y dentro del
// rango de cobertura, aunque la fecha real del sub-item sea otro día).
// Lo que no pertenece a ninguna guardia (extras/interconsultas sueltas) va
// aparte, después de todas las guardias.
interface TooltipGroup {
  guardia?: Transaction;
  items: Transaction[];
}

function buildGroups(shifts: Transaction[]): TooltipGroup[] {
  // Reusa groupShifts en modo 'range': misma semántica que tenía esta función
  // (la guardia es dueña de sus sub-items dentro de [date, endDate], sin
  // exclusividad entre guardias solapadas). El render de abajo no cambia.
  return groupShifts(shifts, 'range').map(g => ({
    guardia: g.guardia,
    items: g.guardia ? g.subItems : g.standalone,
  }));
}

export function ShiftTooltip({ hoverInfo, t }: ShiftTooltipProps) {
  const groups = buildGroups(hoverInfo.shifts);

  return (
    <div
      className="hidden lg:block fixed pointer-events-none z-[60] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 min-w-[240px] max-w-[320px] max-h-[75vh] overflow-y-auto"
      style={{
        // Nunca sale del viewport: margen de 20px a la derecha y abajo.
        left: Math.min(hoverInfo.x + 16, window.innerWidth - 340),
        top: Math.min(Math.max(hoverInfo.y - 10, 10), window.innerHeight - 180),
      }}
    >
      {isHolidayDay(hoverInfo.day) && (
        <p className="text-[9px] font-black text-amber-700 dark:text-amber-300 mb-1.5 pb-1.5 border-b border-amber-100 dark:border-amber-900/40 truncate">
          {holidayName(hoverInfo.day) ?? t.feriadoNacional}
        </p>
      )}
      {groups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && <div className="my-1.5 border-t border-slate-100 dark:border-slate-700" />}
          {group.guardia ? (
            <div>
              <p className="text-[9px] font-black text-slate-900 dark:text-white truncate mb-1.5 pb-1.5 border-b border-slate-100 dark:border-slate-700">
                {group.guardia.institution}
              </p>
              {/* Fila principal: tipo + monto + estado. El rango va en su propia
                  línea abajo, COMPLETO (el texto "Guardia de 10h · 05/08 22:00 →
                  06/08 08:00" no debe cortarse con "…" por compartir fila). */}
              <div className="flex items-center gap-1.5 text-[8px] leading-snug min-w-0">
                <div className={cn("w-2 h-2 rounded-full shrink-0", typeStyle(ShiftType.ACTIVE))} />
                <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">{typeLabel(ShiftType.ACTIVE, t)}</span>
                <span className={cn(
                  "font-black ml-auto whitespace-nowrap shrink-0",
                  group.guardia.status === PaymentStatus.PAID ? "text-green-600" : "text-slate-900 dark:text-white"
                )}>
                  ${group.guardia.amount.toLocaleString('es-AR')}
                </span>
                <StatusBadge status={group.guardia.status} t={t} />
              </div>
              <p className="mt-0.5 text-[8px] font-bold text-slate-400 dark:text-slate-500 leading-snug break-words">
                {formatGuardiaRange(group.guardia, t.guardiaDe)}
              </p>
              {group.items.length > 0 && (
                <div className="mt-1.5 space-y-1 pl-2.5 border-l-2 border-slate-200 dark:border-slate-700">
                  {group.items.map(s => <ItemRow key={s.id} s={s} t={t} />)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {group.items.map(s => <ItemRow key={s.id} s={s} t={t} />)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
