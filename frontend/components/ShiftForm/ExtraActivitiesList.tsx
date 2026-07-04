import { X, Plus, Clock, Check } from 'lucide-react';
import { PaymentStatus } from '../../types';
import { cn } from '../../lib/utils';

interface ExtraActivity {
  id: string;
  type: 'procedimiento' | 'interconsulta';
  procedureName?: string;
  specialty?: string;
  amount: number;
  notes?: string;
  status: PaymentStatus;
}

interface ExtraActivitiesListProps {
  extras: ExtraActivity[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<ExtraActivity>) => void;
  onRemove: (id: string) => void;
  extraTotal: number;
  procedimientoRate: number;
  interconsultaRate: number;
}

export function ExtraActivitiesList({ extras, onAdd, onUpdate, onRemove, extraTotal, procedimientoRate, interconsultaRate }: ExtraActivitiesListProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">Actividades adicionales</p>
            <p className="text-[8px] text-slate-400">Agregá procedimientos o interconsultas realizados con sus montos</p>
          </div>
          <button type="button" onClick={onAdd}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline shrink-0 min-h-[36px]">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>
      </div>
      {extras.length > 0 && (
        <div className="space-y-2">
          {extras.map(extra => (
            <div key={extra.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <button type="button" onClick={() => onUpdate(extra.id, { type: 'procedimiento', amount: procedimientoRate || extra.amount })}
                    className={cn("px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase",
                      extra.type === 'procedimiento' ? 'bg-purple-600 text-white min-h-[32px]' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 min-h-[32px]')}>
                    Proced.
                  </button>
                  <button type="button" onClick={() => onUpdate(extra.id, { type: 'interconsulta', amount: interconsultaRate || extra.amount })}
                    className={cn("px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase",
                      extra.type === 'interconsulta' ? 'bg-green-600 text-white min-h-[32px]' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 min-h-[32px]')}>
                    Interc.
                  </button>
                </div>
                <button type="button" onClick={() => onRemove(extra.id)}
                  className="p-2 text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {extra.type === 'procedimiento' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={extra.procedureName || ''} onChange={e => onUpdate(extra.id, { procedureName: e.target.value })}
                    placeholder="Procedimiento" title="Nombre del procedimiento realizado (ej: RMN rodilla, ecografía abdominal)"
                    className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-900 dark:text-white" />
                  <input type="text" inputMode="numeric" value={extra.amount || ''} onChange={e => onUpdate(extra.id, { amount: parseInt(e.target.value.replace(/\D/g, '')) || 0 })}
                    placeholder="Monto $" className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-900 dark:text-white" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={extra.specialty || ''} onChange={e => onUpdate(extra.id, { specialty: e.target.value })}
                    placeholder="Especialidad" title="Especialidad que realizó la interconsulta (ej: Cirugía general, Neurología)"
                    className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-900 dark:text-white" />
                  <input type="text" inputMode="numeric" value={extra.amount || ''} onChange={e => onUpdate(extra.id, { amount: parseInt(e.target.value.replace(/\D/g, '')) || 0 })}
                    placeholder="Monto $" className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-900 dark:text-white" />
                </div>
              )}
              <input type="text" value={extra.notes || ''} onChange={e => onUpdate(extra.id, { notes: e.target.value })}
                placeholder="Notas (opcional)" className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-lg p-2 text-sm text-slate-900 dark:text-white" />
              <div className="flex gap-1">
                <button type="button" onClick={() => onUpdate(extra.id, { status: PaymentStatus.PENDING })}
                  className={cn("flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold uppercase",
                    extra.status === PaymentStatus.PENDING ? 'bg-orange-500 text-white shadow-sm min-h-[28px]' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 min-h-[28px]')}>
                  <Clock className="w-2.5 h-2.5" /> Pendiente
                </button>
                <button type="button" onClick={() => onUpdate(extra.id, { status: PaymentStatus.PAID })}
                  className={cn("flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold uppercase",
                    extra.status === PaymentStatus.PAID ? 'bg-green-600 text-white shadow-sm min-h-[28px]' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 min-h-[28px]')}>
                  <Check className="w-2.5 h-2.5" /> Pagado
                </button>
              </div>
            </div>
          ))}
          {extraTotal > 0 && (
            <p className="text-xs font-bold text-slate-500 text-right">Extra total: ${extraTotal.toLocaleString('es-AR')}</p>
          )}
        </div>
      )}
    </div>
  );
}
