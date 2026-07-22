import { useMemo, useState } from 'react';
import { format, isToday, type Locale } from 'date-fns';
import { Clock, FileText, Edit3, Trash2, Plus } from 'lucide-react';
import { Transaction, PaymentStatus, ShiftType } from '../../types';
import { cn } from '../../lib/utils';
import { ConfirmModal } from '../ui/ConfirmModal';

interface GroupedShift {
  guardia?: Transaction;
  subItems: Transaction[];
  standalone: Transaction[];
}

function groupShifts(shifts: Transaction[]): GroupedShift[] {
  // First pass: group by date + institution to find guardias with sub-items
  const groups = new Map<string, Transaction[]>();
  for (const s of shifts) {
    const key = `${s.date}|${s.institution}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const result: GroupedShift[] = [];
  const usedIds = new Set<string>();

  for (const items of groups.values()) {
    const guardias = items.filter(s => s.type === ShiftType.ACTIVE);
    const others = items.filter(s => s.type !== ShiftType.ACTIVE);

    if (guardias.length === 1) {
      // Single guardia: it owns sub-items (procedimientos, etc.)
      const g = guardias[0];
      usedIds.add(g.id);
      result.push({
        guardia: g,
        subItems: others.filter(o => !usedIds.has(o.id)),
        standalone: [],
      });
      others.forEach(o => usedIds.add(o.id));
    } else if (guardias.length > 1) {
      // Multiple guardias on same day+institution: each gets its own group
      for (const g of guardias) {
        usedIds.add(g.id);
        result.push({
          guardia: g,
          subItems: [],
          standalone: [],
        });
      }
    } else {
      // No guardia: each item is standalone
      items.forEach(item => {
        if (!usedIds.has(item.id)) {
          result.push({ guardia: undefined, subItems: [], standalone: [item] });
          usedIds.add(item.id);
        }
      });
    }
  }
  return result;
}

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
  const dayTotal = shifts.reduce((s, t) => s + t.amount, 0);
  const paid = shifts.filter(s => s.status === PaymentStatus.PAID).reduce((s, t) => s + t.amount, 0);
  const pending = shifts.filter(s => s.status === PaymentStatus.PENDING).reduce((s, t) => s + t.amount, 0);

  const grouped = useMemo(() => groupShifts(shifts), [shifts]);

  const typeLabel = (type: ShiftType) => {
    switch (type) {
      case ShiftType.ACTIVE: return 'Guardia';
      case ShiftType.CONSULTATION: return 'Proced.';
      case ShiftType.EXTRA: return 'Extra';
      case ShiftType.PASSIVE: return 'Intercons.';
      default: return '';
    }
  };

  const typeStyle = (type: ShiftType) => {
    switch (type) {
      case ShiftType.ACTIVE: return 'text-blue-600 bg-blue-50 dark:bg-blue-900/40';
      case ShiftType.CONSULTATION: return 'text-purple-600 bg-purple-50 dark:bg-purple-900/40';
      case ShiftType.EXTRA: return 'text-amber-600 bg-amber-50 dark:bg-amber-900/40';
      case ShiftType.PASSIVE: return 'text-green-600 bg-green-50 dark:bg-green-900/40';
      default: return '';
    }
  };

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
              {shifts.length} {t.turnos} registrados
            </p>
         </div>
         <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-[1.2rem] flex items-center justify-center shrink-0">
           <Clock className="w-6 h-6" />
         </div>
      </div>

      {shifts.length > 0 && (
        <div className="flex gap-2 text-[9px] font-black uppercase tracking-wider">
          <span className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg">
            Cobrado: ${(paid / 1000).toFixed(0)}k
          </span>
          <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-2 py-1 rounded-lg">
            Pendiente: ${(pending / 1000).toFixed(0)}k
          </span>
        </div>
      )}

      <div className="space-y-3 flex-1">
        {grouped.map((group, gi) => {
          // Guardia group: main card with sub-items nested
          if (group.guardia) {
            const g = group.guardia;
            return (
              <div key={`g-${gi}`}
                className="p-4 rounded-[2rem] bg-slate-100 dark:bg-slate-900/50 border border-transparent hover:border-blue-100 dark:hover:border-blue-900 transition-all space-y-3">
                {/* Guardia header */}
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 dark:text-white text-sm tracking-tight truncate leading-none">{g.institution}</h4>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={cn("text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider", typeStyle(g.type))}>{typeLabel(g.type)}</span>
                        {g.startTime && g.endTime && (
                          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                            {g.startTime}→{g.endTime}
                            {g.endDate && g.endDate !== g.date && ` (${g.endDate})`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                    <span className="font-black text-base text-slate-900 dark:text-white tracking-tighter">${g.amount.toLocaleString('es-AR')}</span>
                    <span className={cn("block text-[8px] font-black uppercase tracking-widest",
                      g.status === PaymentStatus.PAID ? 'text-green-500' : 'text-orange-400')}>
                      {g.status === PaymentStatus.PAID ? '• Pagado' : '• Pendiente'}
                    </span>
                  </div>
                </div>

                {g.notes && (
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium bg-white/50 dark:bg-black/20 p-2 rounded-xl italic">"{g.notes}"</p>
                )}

                {/* Sub-items nested */}
                {group.subItems.length > 0 && (
                  <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                    {group.subItems.map(sub => (
                      <div key={sub.id} className="pl-3 border-l-2 border-slate-300 dark:border-slate-600">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                            <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider shrink-0", typeStyle(sub.type))}>{typeLabel(sub.type)}</span>
                            {sub.conceptName && (
                              <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate">{sub.conceptName}</span>
                            )}
                            {sub.notes && !sub.conceptName && (
                              <span className="text-[9px] text-slate-600 dark:text-slate-300 truncate italic">"{sub.notes}"</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">${sub.amount.toLocaleString('es-AR')}</span>
                            <button onClick={() => onOpenForm(undefined, sub)}
                              className="p-1 bg-white dark:bg-slate-800 text-blue-600 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 transition-all"
                              title={t.editar}><Edit3 className="w-3 h-3" /></button>
                            <button onClick={() => setConfirmDeleteId(sub.id)}
                              className="p-1 bg-white dark:bg-slate-800 text-red-500 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 transition-all"
                              title={t.eliminar}><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Guardia edit/delete */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <>
                    <button onClick={() => onOpenForm(undefined, g)}
                      className="p-2.5 bg-white dark:bg-slate-800 text-blue-600 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
                      title={t.editar}><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmDeleteId(g.id)}
                      className="p-2.5 bg-white dark:bg-slate-800 text-red-500 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
                      title={t.eliminar}><Trash2 className="w-4 h-4" /></button>
                  </>
                </div>
              </div>
            );
          }

          // Standalone items (no guardia in group)
          return group.standalone.map(item => (
            <div key={item.id}
              className="group p-4 rounded-[2rem] bg-slate-100 dark:bg-slate-900/50 border border-transparent hover:border-blue-100 dark:hover:border-blue-900 transition-all space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm tracking-tight truncate leading-none">{item.institution}</h4>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={cn("text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider", typeStyle(item.type))}>{typeLabel(item.type)}</span>
                    {item.startTime && item.endTime && (
                      <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                        {item.startTime}→{item.endTime}
                        {item.endDate && item.endDate !== item.date && ` (${item.endDate})`}
                      </span>
                    )}
                    {item.notes && <FileText className="w-3 h-3 text-slate-400 dark:text-slate-500" />}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="font-black text-base text-slate-900 dark:text-white tracking-tighter">${item.amount.toLocaleString('es-AR')}</span>
                  <span className={cn("block text-[8px] font-black uppercase tracking-widest",
                    item.status === PaymentStatus.PAID ? 'text-green-500' : 'text-orange-400')}>
                    {item.status === PaymentStatus.PAID ? '• Pagado' : '• Pendiente'}
                  </span>
                </div>
              </div>

              {item.notes && (
                <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium bg-white/50 dark:bg-black/20 p-2 rounded-xl italic">"{item.notes}"</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <>
                  <button onClick={() => onOpenForm(undefined, item)}
                    className="p-2.5 bg-white dark:bg-slate-800 text-blue-600 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title={t.editar}><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => setConfirmDeleteId(item.id)}
                    className="p-2.5 bg-white dark:bg-slate-800 text-red-500 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
                    title={t.eliminar}><Trash2 className="w-4 h-4" /></button>
                </>
              </div>
            </div>
          ));
        })}

        {shifts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-200 dark:text-slate-700 shadow-sm">
              <Plus className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Sin registros</p>
              <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Tocá para añadir actividad</p>
            </div>
            <button onClick={() => onOpenForm(format(selectedDay, 'yyyy-MM-dd'))}
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline pt-2">Registrar ahora</button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Eliminar actividad"
        message="¿Eliminar esta actividad? No se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
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
