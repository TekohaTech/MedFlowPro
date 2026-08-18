import { Clock, Stethoscope, UserCheck, Info, RotateCcw, CalendarDays, Building2 } from 'lucide-react';
import { Institution } from '../types';
import { cn } from '../lib/utils';
import { translations, type Language } from '../translations';
import { useRateEditor, type RateType, parseRateInput, shouldSkipRateSave } from '../hooks/useRateEditor';
import { RateRow } from './RateRow';

export { parseRateInput, shouldSkipRateSave };
export type { RateType };

interface RateEditorProps {
  institution: Institution;
  onInstitutionChange: (inst: Institution) => void;
  language?: Language;
}

export function RateEditor({ institution, onInstitutionChange, language = 'es' }: RateEditorProps) {
  const t = translations[language];
  const HELP_ICON = String.fromCharCode(0x1F4A1);

  const {
    editingRateType, setEditingRateType,
    tempRateValue, setTempRateValue,
    rateFeedback,
    showTooltip, setShowTooltip,
    pendingDialog, setPendingDialog,
    handleSaveRateEdit,
    handleApplyToPending,
    handleRateClick,
    handleCancelEdit,
  } = useRateEditor({ institution, onInstitutionChange, language });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Building2 className="w-3 h-3 text-slate-400" />
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.tarifasReferencia}</span>
        <span className="text-[7px] text-slate-300 ml-auto hidden sm:inline">{t.tocaParaEditar}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <div className="flex items-center gap-1">
          <RateRow label="Gdia sem" type="guardia_semana_rate" icon={<Clock className="w-3 h-3 text-blue-400" />}
            borderColor="border-blue-300" value={institution.guardia_semana_rate ?? institution.guardia_rate}
            language={language} editingRateType={editingRateType} tempRateValue={tempRateValue}
            onEdit={handleRateClick} onSave={handleSaveRateEdit} onCancel={handleCancelEdit}
            onTempValueChange={setTempRateValue} />
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
                {t.tooltipCalculo.replace('{semana}', t.semana).replace('{finde}', t.finde).replace('{feriado}', t.feriado)}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
              </div>
            )}
          </div>
        </div>
        <RateRow label="Gdia finde" type="guardia_finde_rate" icon={<Clock className="w-3 h-3 text-blue-400" />}
          borderColor="border-blue-300" value={institution.guardia_finde_rate ?? institution.guardia_rate}
          language={language} editingRateType={editingRateType} tempRateValue={tempRateValue}
          onEdit={handleRateClick} onSave={handleSaveRateEdit} onCancel={handleCancelEdit}
          onTempValueChange={setTempRateValue} />
        <RateRow label="Gdia feriado" type="guardia_feriado_rate" icon={<CalendarDays className="w-3 h-3 text-amber-400" />}
          borderColor="border-amber-300" value={institution.guardia_feriado_rate}
          language={language} editingRateType={editingRateType} tempRateValue={tempRateValue}
          onEdit={handleRateClick} onSave={handleSaveRateEdit} onCancel={handleCancelEdit}
          onTempValueChange={setTempRateValue} />
        <RateRow label="Proced." type="procedimiento_rate" icon={<Stethoscope className="w-3 h-3 text-purple-400" />}
          borderColor="border-purple-300" value={institution.procedimiento_rate}
          language={language} editingRateType={editingRateType} tempRateValue={tempRateValue}
          onEdit={handleRateClick} onSave={handleSaveRateEdit} onCancel={handleCancelEdit}
          onTempValueChange={setTempRateValue} />
        <RateRow label="Interc." type="interconsulta_rate" icon={<UserCheck className="w-3 h-3 text-green-400" />}
          borderColor="border-green-300" value={institution.interconsulta_rate}
          language={language} editingRateType={editingRateType} tempRateValue={tempRateValue}
          onEdit={handleRateClick} onSave={handleSaveRateEdit} onCancel={handleCancelEdit}
          onTempValueChange={setTempRateValue} />
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
            {t.aplicarCambioPendientes}
          </p>
          <div className="flex items-center gap-2">
            <input type="date" value={pendingDialog.fromDate}
              onChange={(e) => setPendingDialog({ ...pendingDialog, fromDate: e.target.value })}
              className="flex-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg p-1.5 text-[10px] font-bold text-slate-900 dark:text-white" />
            <button type="button" onClick={handleApplyToPending} disabled={pendingDialog.loading}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50">
              {pendingDialog.loading ? '...' : t.aplicar}
            </button>
            <button type="button" onClick={() => setPendingDialog(null)}
              className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-slate-50">
              {t.noLabel}
            </button>
          </div>
        </div>
      )}
      {pendingDialog?.result && (
        <p className="text-[10px] font-bold text-green-600 dark:text-green-400 animate-in fade-in">{pendingDialog.result}</p>
      )}

      <p className="text-[8px] text-slate-400 flex items-center gap-1">
        {HELP_ICON} {t.tarifasSoloReferencia} {t.ingresarValor} manualmente abajo.
      </p>
    </div>
  );
}
