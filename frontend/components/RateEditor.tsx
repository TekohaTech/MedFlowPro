import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock, Stethoscope, UserCheck, Check, X, Pencil, Building2, Info, RotateCcw, CalendarDays } from 'lucide-react';
import { Institution } from '../types';
import { cn, formatCurrency, parseAmount, formatMoneyInput } from '../lib/utils';
import { api } from '../services/api';

type RateType = 'guardia_semana_rate' | 'guardia_finde_rate' | 'guardia_feriado_rate' | 'procedimiento_rate' | 'interconsulta_rate';

/**
 * Parses the inline edit input with es-AR rules: '1250,50' → 1250.5,
 * '8.000' → 8000, '12000' → 12000. '' → null (unset), junk/letters → null.
 */
export function parseRateInput(value: string): number | null {
  const cleaned = value.replace(/[^\d.,]/g, '');
  if (!/\d/.test(cleaned)) return null;
  return parseAmount(cleaned);
}

/**
 * True when the edit is a no-op: the input parses to the same value as the
 * current rate, including both empty/unset (undefined counts as unset).
 * Example: opening the editor on an already-set rate and blurring without
 * changing anything must NOT hit the API.
 */
export function shouldSkipRateSave(numValue: number | null, prevValue: number | null | undefined): boolean {
  return numValue === (prevValue ?? null);
}

interface RateEditorProps {
  institution: Institution;
  onInstitutionChange: (inst: Institution) => void;
}

export function RateEditor({ institution, onInstitutionChange }: RateEditorProps) {
  const HELP_ICON = String.fromCharCode(0x1F4A1);
  const [editingRateType, setEditingRateType] = useState<RateType | null>(null);
  const [tempRateValue, setTempRateValue] = useState('');
  const [rateFeedback, setRateFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Dialog recalcular pendientes
  const [pendingDialog, setPendingDialog] = useState<{ fromDate: string; loading: boolean; result: string | null } | null>(null);

  useEffect(() => {
    // Success auto-clears after 2s; errors stay visible until the next edit starts.
    if (rateFeedback?.kind === 'success') {
      const timer = setTimeout(() => setRateFeedback(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [rateFeedback]);

  const handleSaveRateEdit = async (type: RateType, value: string) => {
    const numValue = parseRateInput(value);
    const prevValue = institution[type];

    // Nothing changed (same value, or empty input on an unset rate) → just
    // close, no API call, no error, no feedback.
    if (shouldSkipRateSave(numValue, prevValue)) {
      setRateFeedback(null);
      setEditingRateType(null);
      return;
    }

    try {
      const updateData: Partial<Institution> = {};
      updateData[type] = numValue;
      const updated = await api.updateInstitution(institution.id, updateData);
      onInstitutionChange(updated);
      const labels: Record<string, string> = {
        guardia_semana_rate: 'Guardia semana',
        guardia_finde_rate: 'Guardia finde',
        guardia_feriado_rate: 'Guardia feriado',
        procedimiento_rate: 'Proced.',
        interconsulta_rate: 'Interc.',
      };
      setRateFeedback({ kind: 'success', text: `${labels[type]} actualizada ${String.fromCharCode(0x2713)}` });

      // Solo preguntar si cambió tarifa de guardia
      if (numValue !== prevValue && (type === 'guardia_semana_rate' || type === 'guardia_finde_rate' || type === 'guardia_feriado_rate')) {
        setPendingDialog({
          // Local date — toISOString() runs UTC and can shift a 21:00-23:59
          // local "today" onto the next calendar day.
          fromDate: format(new Date(), 'yyyy-MM-dd'),
          loading: false,
          result: null,
        });
      }
    } catch (e) {
      console.error('Error saving rate', e);
      setRateFeedback({ kind: 'error', text: 'No se pudo guardar la tarifa. Revisá tu conexión e intentá de nuevo.' });
    }
    setEditingRateType(null);
  };

  const handleApplyToPending = async () => {
    if (!pendingDialog) return;
    setPendingDialog({ ...pendingDialog, loading: true, result: null });
    try {
      const res = await api.recalculatePending(institution.id, pendingDialog.fromDate);
      setPendingDialog({
        ...pendingDialog,
        loading: false,
        result: `✅ ${res.updated_count} guardia${res.updated_count !== 1 ? 's' : ''} actualizada${res.updated_count !== 1 ? 's' : ''}`,
      });
    } catch {
      setPendingDialog({ ...pendingDialog, loading: false, result: '❌ Error al recalcular' });
    }
  };

  const RATE_HELP: Record<string, string> = {
    guardia_semana_rate: 'Valor por hora de guardia en día de semana (lun a vie)',
    guardia_finde_rate: 'Valor por hora de guardia en fin de semana (sáb o dom)',
    guardia_feriado_rate: 'Valor por hora de guardia en feriado nacional',
    procedimiento_rate: 'Valor por procedimiento (ej: RMN, ecografía)',
    interconsulta_rate: 'Valor por interconsulta (ej: evaluación de otra especialidad)',
  };

  const renderRateRow = (
    label: string,
    type: RateType,
    icon: React.ReactNode,
    borderColor: string,
    value: number | null | undefined,
    showSuffix: boolean = true,
  ) => (
    <div className="flex items-center gap-1">
      {icon}
      {editingRateType === type ? (
        <div className="flex items-center gap-1 max-w-full">
          <span className="text-slate-500 shrink-0">{label}:</span>
          <input type="text" inputMode="numeric" value={tempRateValue}
            placeholder="Ingresá valor"
            onChange={(e) => setTempRateValue(formatMoneyInput(e.target.value))}
            onBlur={(e) => {
              if (e.relatedTarget?.tagName === 'BUTTON') return;
              handleSaveRateEdit(type, tempRateValue);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveRateEdit(type, tempRateValue);
              if (e.key === 'Escape') setEditingRateType(null);
            }}
            className={cn("w-24 sm:w-20 min-w-0 bg-white dark:bg-slate-700 border rounded px-1 py-0.5 text-[10px] font-bold text-slate-900 dark:text-white outline-none", borderColor)}
            autoFocus />
          <button type="button" onClick={() => handleSaveRateEdit(type, tempRateValue)}
            className="p-1.5 text-green-500 hover:text-green-700"><Check className="w-3 h-3" /></button>
          <button type="button" onClick={() => setEditingRateType(null)}
            className="p-1.5 text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <span className="flex items-center gap-1 text-slate-500" title={RATE_HELP[type]}>
          {label}:
          {value != null ? (
            <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(value)}{showSuffix ? '/h' : ''}</span>
          ) : (
            <span className="text-slate-300 italic">—</span>
          )}
          <button type="button" title="Editar" onClick={() => { setRateFeedback(null); setEditingRateType(type); setTempRateValue(value != null ? value.toLocaleString('es-AR') : ''); }}
            className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors">
            <Pencil className="w-2.5 h-2.5" />
          </button>
        </span>
      )}
    </div>
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Building2 className="w-3 h-3 text-slate-400" />
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tarifas de referencia</span>
        <span className="text-[7px] text-slate-300 ml-auto hidden sm:inline">tocá un valor para editar</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <div className="flex items-center gap-1">
          {renderRateRow('Gdia sem', 'guardia_semana_rate', <Clock className="w-3 h-3 text-blue-400" />, 'border-blue-300', institution.guardia_semana_rate ?? institution.guardia_rate)}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTooltip(!showTooltip)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"
            >
              <Info className="w-2.5 h-2.5" />
            </button>
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-800 dark:bg-slate-700 text-white text-[8px] leading-tight rounded-lg shadow-lg z-50 pointer-events-none">
                Se calcula por horas según el día: semana, fin de semana o feriado. El día va de 08:00 a 08:00.
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
              </div>
            )}
          </div>
        </div>
        {renderRateRow('Gdia finde', 'guardia_finde_rate', <Clock className="w-3 h-3 text-blue-400" />, 'border-blue-300', institution.guardia_finde_rate ?? institution.guardia_rate)}
        {renderRateRow('Gdia feriado', 'guardia_feriado_rate', <CalendarDays className="w-3 h-3 text-amber-400" />, 'border-amber-300', institution.guardia_feriado_rate)}
        {renderRateRow('Proced.', 'procedimiento_rate', <Stethoscope className="w-3 h-3 text-purple-400" />, 'border-purple-300', institution.procedimiento_rate)}
        {renderRateRow('Interc.', 'interconsulta_rate', <UserCheck className="w-3 h-3 text-green-400" />, 'border-green-300', institution.interconsulta_rate)}
      </div>
      {rateFeedback && (
        <p className={cn("text-[9px] font-bold animate-in fade-in",
          rateFeedback.kind === 'error' ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
          {rateFeedback.text}
        </p>
      )}

      {/* Dialog: aplicar cambio a guardias pendientes */}
      {pendingDialog && !pendingDialog.result && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 space-y-2 animate-in fade-in slide-in-from-top-2">
          <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />
            ¿Aplicar este cambio a guardias pendientes?
          </p>
          <div className="flex items-center gap-2">
            <input type="date" value={pendingDialog.fromDate}
              onChange={(e) => setPendingDialog({ ...pendingDialog, fromDate: e.target.value })}
              className="flex-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg p-1.5 text-[10px] font-bold text-slate-900 dark:text-white" />
            <button type="button" onClick={handleApplyToPending} disabled={pendingDialog.loading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50">
              {pendingDialog.loading ? '...' : 'Aplicar'}
            </button>
            <button type="button" onClick={() => setPendingDialog(null)}
              className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-slate-50 transition-colors">
              No
            </button>
          </div>
        </div>
      )}
      {pendingDialog?.result && (
        <p className="text-[10px] font-bold text-green-600 dark:text-green-400 animate-in fade-in">{pendingDialog.result}</p>
      )}

      <p className="text-[8px] text-slate-400 flex items-center gap-1">
        {HELP_ICON} Las tarifas son solo referencia. Ingresá los valores manualmente abajo.
      </p>
    </div>
  );
}
