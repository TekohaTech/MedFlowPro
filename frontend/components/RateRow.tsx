import { Check, X, Pencil } from 'lucide-react';
import { cn, formatCurrency, formatMoneyInput } from '../lib/utils';
import { translations, type Language } from '../translations';
import type { RateType } from '../hooks/useRateEditor';

interface RateRowProps {
  label: string;
  type: RateType;
  icon: React.ReactNode;
  borderColor: string;
  value: number | null | undefined;
  showSuffix?: boolean;
  language: Language;
  editingRateType: RateType | null;
  tempRateValue: string;
  onEdit: (type: RateType, value: number | null | undefined) => void;
  onSave: (type: RateType, value: string) => void;
  onCancel: () => void;
  onTempValueChange: (value: string) => void;
}

export function RateRow({
  label, type, icon, borderColor, value, showSuffix = true,
  language, editingRateType, tempRateValue,
  onEdit, onSave, onCancel, onTempValueChange,
}: RateRowProps) {
  const t = translations[language];

  const rateHelpKey: Record<RateType, string> = {
    guardia_semana_rate: t.rateHelpSemana,
    guardia_finde_rate: t.rateHelpFinde,
    guardia_feriado_rate: t.rateHelpFeriado,
    procedimiento_rate: t.rateHelpProced,
    interconsulta_rate: t.rateHelpInter,
  };

  if (editingRateType === type) {
    return (
      <div className="flex items-center gap-1">
        {icon}
        <div className="flex items-center gap-1 max-w-full">
          <span className="text-slate-500 shrink-0">{label}:</span>
          <input type="text" inputMode="numeric" value={tempRateValue}
            placeholder={t.ingresarValor}
            onChange={(e) => onTempValueChange(formatMoneyInput(e.target.value))}
            onBlur={(e) => {
              if (e.relatedTarget?.tagName === 'BUTTON') return;
              onSave(type, tempRateValue);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(type, tempRateValue);
              if (e.key === 'Escape') onCancel();
            }}
            className={cn("w-24 sm:w-20 min-w-0 bg-white dark:bg-slate-700 border rounded px-1 py-0.5 text-[10px] font-bold text-slate-900 dark:text-white outline-none", borderColor)}
            autoFocus />
          <button type="button" onClick={() => onSave(type, tempRateValue)}
            className="p-1.5 text-green-500 hover:text-green-700"><Check className="w-3 h-3" /></button>
          <button type="button" onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {icon}
      <span className="flex items-center gap-1 text-slate-500" title={rateHelpKey[type]}>
        {label}:
        {value != null ? (
          <span className="text-slate-900 dark:text-white font-bold">{formatCurrency(value)}{showSuffix ? '/h' : ''}</span>
        ) : (
          <span className="text-slate-300 italic">—</span>
        )}
        <button type="button" title={t.editandoLabel} onClick={() => onEdit(type, value)}
          className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors">
          <Pencil className="w-2.5 h-2.5" />
        </button>
      </span>
    </div>
  );
}
