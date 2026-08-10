import { PaymentStatus, ShiftType, Transaction } from '../../types';
import { cn } from '../../lib/utils';
import { isHolidayDay, holidayName } from '../../lib/feriados';
import { formatGuardiaRange } from './calendarUtils';

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

const TYPE_LABELS: Record<string, string> = {
  [ShiftType.ACTIVE]: 'Guardia',
  [ShiftType.CONSULTATION]: 'Proced.',
  [ShiftType.EXTRA]: 'Extra',
  [ShiftType.PASSIVE]: 'Interc.',
};

function dot(type: ShiftType) {
  return type === ShiftType.EXTRA ? "bg-amber-500"
    : type === ShiftType.CONSULTATION ? "bg-purple-500"
    : type === ShiftType.PASSIVE ? "bg-green-500"
    : "bg-blue-500";
}

// Vista rápida de cobro: badge con color propio, sin depender solo del monto.
function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={cn(
      "text-[6px] lg:text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded shrink-0",
      status === PaymentStatus.PAID
        ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
        : "bg-orange-100 dark:bg-orange-900/40 text-orange-500 dark:text-orange-400"
    )}>
      {status === PaymentStatus.PAID ? 'Pagado' : 'Pendiente'}
    </span>
  );
}

// Cuándo se hizo cada cosa, sin ambigüedad:
// - Guardia: rango legible con duración (reusa formatGuardiaRange).
// - Sub-items (proced./interc.): SIEMPRE con su fecha real + hora, porque el
//   hover puede estar en un día de cobertura distinto al día en que se hizo.
// - Extras: misma regla, fecha + hora si existe.
function formatItemWhen(s: Transaction): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date(`${s.date}T${s.startTime || '00:00'}`);
  const dmy = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  if (s.type === ShiftType.ACTIVE) return formatGuardiaRange(s);
  if (s.endDate && s.endDate !== s.date) return formatGuardiaRange(s);
  return s.startTime ? `${dmy} ${s.startTime.slice(0, 5)}` : dmy;
}

// Fila con min-w-0 + truncate: con montos de 7-8 dígitos o textos largos el
// contenido se corta dentro del tooltip en vez de empujar y desbordar.
function ItemRow({ s }: { s: Transaction }) {
  return (
    <div className="flex items-center gap-1.5 text-[8px] leading-snug min-w-0">
      <div className={cn("w-2 h-2 rounded-full shrink-0", dot(s.type))} />
      <span className="font-bold text-slate-500 dark:text-slate-400 w-[52px] shrink-0">{TYPE_LABELS[s.type]}</span>
      <span className="text-slate-400 dark:text-slate-500 font-bold truncate min-w-0">{formatItemWhen(s)}</span>
      <span className={cn(
        "font-black whitespace-nowrap shrink-0",
        s.status === PaymentStatus.PAID ? "text-green-600" : "text-slate-900 dark:text-white"
      )}>
        ${s.amount.toLocaleString('es-AR')}
      </span>
      <StatusBadge status={s.status} />
    </div>
  );
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
  const guardias = shifts.filter(s => s.type === ShiftType.ACTIVE);
  const rest = shifts.filter(s => s.type !== ShiftType.ACTIVE);
  const used = new Set<string>();
  const groups: TooltipGroup[] = [];

  for (const g of guardias) {
    const gStart = g.date;
    const gEnd = g.endDate || g.date;
    const owned = rest.filter(s =>
      s.institution === g.institution &&
      s.date >= gStart && s.date <= gEnd &&
      (s.type === ShiftType.CONSULTATION || s.type === ShiftType.PASSIVE)
    );
    owned.forEach(s => used.add(s.id));
    groups.push({ guardia: g, items: owned });
  }

  const standalone = rest.filter(s => !used.has(s.id));
  if (standalone.length > 0) groups.push({ guardia: undefined, items: standalone });
  return groups;
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
                <div className={cn("w-2 h-2 rounded-full shrink-0", dot(ShiftType.ACTIVE))} />
                <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">Guardia</span>
                <span className={cn(
                  "font-black ml-auto whitespace-nowrap shrink-0",
                  group.guardia.status === PaymentStatus.PAID ? "text-green-600" : "text-slate-900 dark:text-white"
                )}>
                  ${group.guardia.amount.toLocaleString('es-AR')}
                </span>
                <StatusBadge status={group.guardia.status} />
              </div>
              <p className="mt-0.5 text-[8px] font-bold text-slate-400 dark:text-slate-500 leading-snug break-words">
                {formatGuardiaRange(group.guardia)}
              </p>
              {group.items.length > 0 && (
                <div className="mt-1.5 space-y-1 pl-2.5 border-l-2 border-slate-200 dark:border-slate-700">
                  {group.items.map(s => <ItemRow key={s.id} s={s} />)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {group.items.map(s => <ItemRow key={s.id} s={s} />)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
