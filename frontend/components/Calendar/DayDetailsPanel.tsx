import { useMemo, useState } from 'react';
import { format, isToday, type Locale } from 'date-fns';
import { Clock, Plus } from 'lucide-react';
import { Transaction, PaymentStatus } from '../../types';
import { cn } from '../../lib/utils';
import { isHolidayDay, holidayName } from '../../lib/feriados';
import { ConfirmModal } from '../ui/ConfirmModal';
import { formatGuardiaRange, groupShifts } from './calendarUtils';
import { ShiftCard } from './ShiftCard';
import { SubItem } from './SubItem';
import { EmptyState } from './EmptyState';

interface DayDetailsPanelProps {
  selectedDay: Date;
  shifts: Transaction[];
  t: Record<string, string>;
  locale: Locale;
  onOpenForm: (date?: string, tx?: Transaction) => void;
  onDelete: (id: string) => void;
  isModal?: boolean;
}

export function DayDetailsPanel({ selectedDay, shifts, t, locale, onOpenForm, onDelete, isModal }: DayDetailsPanelProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const paid = shifts.filter(s => s.status === PaymentStatus.PAID).reduce((s, t) => s + t.amount, 0);
  const pending = shifts.filter(s => s.status === PaymentStatus.PENDING).reduce((s, t) => s + t.amount, 0);

  const grouped = useMemo(() => groupShifts(shifts), [shifts]);

  return (
    <div className={cn(
      "space-y-4 flex flex-col animate-in slide-in-from-right-4 duration-500",
      !isModal && "bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-300 dark:border-slate-700 shadow-2xl shadow-slate-200/50 dark:shadow-none min-h-[400px]"
    )}>
      <div className="flex items-center justify-between">
         <div className="min-w-0">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
              {isToday(selectedDay) ? t.hoy : format(selectedDay, 'EEEE d', { locale })}
            </h3>
            <p className="text-[9px] text-slate-600 dark:text-slate-300 font-black uppercase tracking-[0.2em] mt-1">
              {grouped.length} {t.turnos} {t.registrados}
            </p>
         </div>
         <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-[1.2rem] flex items-center justify-center shrink-0">
           <Clock className="w-6 h-6" />
         </div>
      </div>

      {isHolidayDay(selectedDay) && (
        <div className="self-start max-w-full text-[9px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1.5 rounded-lg leading-tight">
          {holidayName(selectedDay) ?? t.feriadoNacional}
        </div>
      )}

      {shifts.length > 0 && (
        <div className="flex gap-2 text-[9px] font-black uppercase tracking-wider">
          <span className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg">
            {t.cobrado}: ${(paid / 1000).toFixed(0)}k
          </span>
          <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded-lg">
            {t.pendiente}: ${(pending / 1000).toFixed(0)}k
          </span>
        </div>
      )}

      <div className="space-y-4 flex-1">
        {grouped.map((group, gi) => {
          // Guardia group: main card with sub-items nested
          if (group.guardia) {
            const g = group.guardia; const gRange = formatGuardiaRange(g, t.guardiaDe);
            return (
              <ShiftCard key={`g-${gi}`} tx={g} range={gRange} notes={g.notes} t={t} locale={locale} onOpenForm={onOpenForm} onDeleteRequest={setConfirmDeleteId}>
                {/* Sub-items nested */}
                {group.subItems.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    {group.subItems.map(sub => (
                      <SubItem key={sub.id} sub={sub} gRange={gRange} t={t} locale={locale} onOpenForm={onOpenForm} onDeleteRequest={setConfirmDeleteId} />
                    ))}
                  </div>
                )}
              </ShiftCard>
            );
          }

          // Standalone items (no guardia in group)
          return group.standalone.map(item => (
            <ShiftCard key={item.id} tx={item} range={formatGuardiaRange(item, t.guardiaDe)} notes={item.notes || item.procedureName || item.specialty || item.conceptName} t={t} locale={locale} onOpenForm={onOpenForm} onDeleteRequest={setConfirmDeleteId} />
          ));
        })}

        {shifts.length === 0 && <EmptyState t={t} />}

        <button
          onClick={() => onOpenForm(format(selectedDay, 'yyyy-MM-dd'))}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          + {t.registrar}
        </button>
      </div>

      <ConfirmModal
        open={confirmDeleteId !== null}
        title={t.eliminarActividad}
        message={t.eliminarActividadMsg}
        confirmLabel={t.eliminar} cancelLabel={t.cancelar} variant="danger"
        onConfirm={() => {
          if (confirmDeleteId) {
            onDelete(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
