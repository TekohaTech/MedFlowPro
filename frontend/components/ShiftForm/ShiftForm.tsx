import type { MouseEvent as ReactMouseEvent } from 'react';
import { ShiftType, Transaction, PaymentStatus, UserSettings, Institution } from '../../types';
import { X, Check } from 'lucide-react';
import { ActivaPasivaToggle } from '../ActivaPasivaToggle';
import { InstitutionPicker } from '../InstitutionPicker';
import { PaymentStatusToggle } from '../PaymentStatusToggle';
import { TotalAmountDisplay } from '../TotalAmountDisplay';
import { DateTimeInputs } from '../DateTimeInputs';
import { RateEditor } from '../RateEditor';
import { ExtraActivitiesList } from './ExtraActivitiesList';
import { useShiftForm } from './useShiftForm';
import { cn } from '../../lib/utils';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';

interface ShiftFormProps {
  onClose: () => void;
  onSubmit: (tx: Partial<Transaction>) => void;
  initialDate?: string;
  editingTransaction?: Transaction;
  transactions?: Transaction[];
  settings: UserSettings;
  institutions: Institution[];
  onInstitutionChange: (inst: Institution) => void;
  onInstitutionDelete: (id: string) => void;
}

export function ShiftForm({
  onClose, onSubmit, initialDate, editingTransaction,
  transactions, settings, institutions, onInstitutionChange, onInstitutionDelete
}: ShiftFormProps) {
  const form = useShiftForm(onSubmit, editingTransaction, transactions, initialDate, institutions, onClose, settings.language);
  const isExtra = form.activityMode === 'extra';

  const editLabel = editingTransaction
    ? (editingTransaction.type === ShiftType.ACTIVE ? 'Editar Guardia'
      : editingTransaction.type === ShiftType.CONSULTATION ? 'Editar Procedimiento'
      : editingTransaction.type === ShiftType.PASSIVE ? 'Editar Interconsulta'
      : editingTransaction.type === ShiftType.EXTRA ? 'Editar Extra'
      : 'Editar')
    : 'Nueva Actividad';

  const handleBackdropClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-end lg:items-center justify-center animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-900 w-full lg:max-w-xl max-h-[90vh] lg:max-h-[85vh] lg:rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 lg:p-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex-1">
              <h2 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white">
                {editLabel}
              </h2>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Tocá fuera para cerrar</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-full flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form action={form.formAction} className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-4">
          {/* Mode Toggle — oculto cuando editamos sub-item (procedimiento/interconsulta) */}
          {!editingTransaction || (editingTransaction.type !== ShiftType.CONSULTATION && editingTransaction.type !== ShiftType.PASSIVE) ? (
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => form.handleModeChange('guardia')}
                  className={cn(
                  "flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all",
                  !isExtra
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Guardia
              </button>
              <button
                type="button"
                onClick={() => form.handleModeChange('extra')}
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all",
                  isExtra
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Extra
              </button>
            </div>
          ) : null}

          {!isExtra && (
            <ActivaPasivaToggle shiftSubtype={form.shiftSubtype} onChange={form.setShiftSubtype} language={settings.language} />
          )}

          <div className="space-y-2">
            <Label>Institución {isExtra && <span className="text-slate-400 font-medium">(opcional)</span>}</Label>
            <InstitutionPicker
              institutions={institutions}
              selected={form.institution}
              onSelect={form.handleSelectInstitution}
              onInstitutionChange={onInstitutionChange}
              onInstitutionDelete={onInstitutionDelete}
              activityMode={isExtra ? 'extra' : 'guardia'}
            />
            {form.institution && !form.selectedInstitution && (
              <p className="text-[10px] text-amber-500 font-bold">
                Atención: Esta institución no está en tu lista de instituciones activas.
              </p>
            )}
          </div>

          {form.selectedInstitution && (!editingTransaction || (editingTransaction.type !== ShiftType.CONSULTATION && editingTransaction.type !== ShiftType.PASSIVE)) && (
            <RateEditor institution={form.selectedInstitution} onInstitutionChange={onInstitutionChange} />
          )}

          {!isExtra && (
            <TotalAmountDisplay amount={form.amount} onChange={form.setAmount} />
          )}

          {isExtra ? (
            /* Extra mode: manual amount + date */
            <>
              {/* Solo mostrar "Nombre del concepto" si es EXTRA nuevo o editando EXTRA */}
              {(!editingTransaction || editingTransaction.type === ShiftType.EXTRA) && (
                <div className="space-y-2">
                  <Label>Nombre del concepto</Label>
                  <input
                    type="text"
                    name="concept_name"
                    value={form.conceptName}
                    onChange={(e) => form.setConceptName(e.target.value)}
                    placeholder="ej: Coordinación SIMES"
                    maxLength={200}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              )}
              <Input label="Monto $" type="text" inputMode="numeric" name="amount_display"
                value={form.amount}
                onChange={(e) => form.setAmount(e.target.value.replace(/\D/g, ''))}
                placeholder="ej: 150000" />

              {/* Extra mode only needs date, no time */}
              <div className="space-y-2">
                <Label>Fecha</Label>
                <input type="date" name="date" value={form.date}
                  onChange={(e) => form.setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white" />
              </div>

              {/* Para procedimiento/interconsulta: nombre separado de notas */}
              {form.isSubItemEdit && (
                <div className="space-y-2">
                  <Label>{form.subItemType === 'procedimiento' ? 'Procedimiento' : 'Especialidad'}</Label>
                  <input
                    type="text"
                    name="sub_item_name"
                    value={form.subItemName}
                    onChange={(e) => form.setSubItemName(e.target.value)}
                    placeholder={form.subItemType === 'procedimiento' ? 'ej: RMN rodilla' : 'ej: Cirugía general'}
                    maxLength={200}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-medium text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </>
          ) : (
            /* Guardia mode: hours, rate, datetime, extra activities */
            <>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Horas" type="number" name="hours" value={form.hours}
                  onChange={(e) => form.setHours(parseInt(e.target.value) || 0)}
                  placeholder="ej: 12" min={1} />
                <Input label="$/Hora" type="text" inputMode="numeric" name="hourly_rate" value={form.hourlyRate}
                  onChange={(e) => form.setHourlyRate(e.target.value.replace(/\D/g, ''))}
                  placeholder="ej: 19000" />
              </div>

              <DateTimeInputs
                date={form.date} endDate={form.endDate} startTime={form.startTime} endTime={form.endTime}
                onDateChange={form.setDate} onEndDateChange={form.setEndDate}
                onStartTimeChange={form.setStartTime} onEndTimeChange={form.setEndTime}
              />

              {/* Weekday Override Checkbox for multi-day shifts */}
              {form.showWeekdayOverride && (
                <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.applyWeekdayRule}
                      onChange={(e) => form.setApplyWeekdayRule(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 leading-tight">
                      Aplicar regla de semana completa: toda la guardia a tarifa de semana porque arranca en día de semana
                    </span>
                  </label>

                  {!form.applyWeekdayRule && (
                    <div className="grid grid-cols-2 gap-3 pl-6">
                      <Input label="Horas semana" type="number" value={form.weekdayHours}
                        onChange={(e) => form.setWeekdayHours(parseInt(e.target.value) || 0)}
                        placeholder="ej: 8" min={0} />
                      <Input label="Horas finde" type="number" value={form.weekendHours}
                        onChange={(e) => form.setWeekendHours(parseInt(e.target.value) || 0)}
                        placeholder="ej: 4" min={0} />
                    </div>
                  )}
                </div>
              )}

              <ExtraActivitiesList extras={form.extras} onAdd={form.addExtra} onUpdate={form.updateExtra} onRemove={form.removeExtra}
                extraTotal={form.extraTotal} procedimientoRate={form.selectedInstitution?.procedimiento_rate || 0}
                interconsultaRate={form.selectedInstitution?.interconsulta_rate || 0} />
            </>
          )}

          <input type="hidden" name="institution" value={form.institution} />
          <input type="hidden" name="status" value={form.status === PaymentStatus.PAID ? 'paid' : 'pending'} />

          {form.formState.error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-700 dark:text-red-400">{form.formState.error}</p>
            </div>
          )}

          <PaymentStatusToggle status={form.status} onChange={form.handleStatusToggle} />

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <textarea name="notes" value={form.notes} onChange={(e) => form.setNotes(e.target.value)}
              placeholder="Observaciones..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl p-2.5 font-medium h-16 resize-none text-slate-900 dark:text-white" />
          </div>

          <button type="submit" disabled={isExtra ? (!form.conceptName || !form.amount || form.isPending) : (!form.institution || !form.amount || form.isPending)}
            className={cn("w-full lg:w-auto lg:px-10 lg:mx-auto p-3 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-all",
              (isExtra ? form.conceptName : form.institution) && form.amount && !form.isPending ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]" : "bg-slate-300 text-slate-500 cursor-not-allowed")}>
            <Check className="w-4 h-4" />
            {form.isPending ? 'Guardando...' : isExtra ? 'Guardar Extra' : form.extras.length > 0 ? `Guardar (${form.extras.length + 1} actividades)` : 'Guardar'}
          </button>
        </form>
      </div>
    </div>
  );
};
