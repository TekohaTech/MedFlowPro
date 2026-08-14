import { INSTITUTION_COLORS } from '../lib/institutionColors';
import { cn } from '../lib/utils';
import { translations, type Language } from '../translations';

interface InstitutionColorPickerProps {
  /** Currently selected hex color, or '' when nothing is selected. */
  value: string;
  /** Hex colors already used by OTHER active institutions (shown as occupied). */
  occupiedColors: string[];
  /** Validation message shown when a color is required but missing. */
  error?: string;
  /** Label hints the selection is mandatory (e.g. when creating). */
  required?: boolean;
  language?: Language;
  onSelect: (color: string) => void;
}

export function InstitutionColorPicker({
  value, occupiedColors, error, required, language = 'es', onSelect,
}: InstitutionColorPickerProps) {
  const t = translations[language];
  const selectedOccupied = value !== '' && occupiedColors.includes(value);

  return (
    <div className="space-y-2">
      <label className="block text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
        {t.colorLabel}
        {required && <span className="text-red-500"> {t.colorRequerido}</span>}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {INSTITUTION_COLORS.map(color => {
          const occupied = occupiedColors.includes(color);
          const isSelected = value === color;
          return (
            <button
              key={color}
              type="button"
              title={occupied ? t.colorEnUsoTooltip : color}
              onClick={() => onSelect(color)}
              aria-label={occupied ? `${color} ${t.enUso}` : color}
              className={cn(
                'w-8 h-8 rounded-full relative transition-all shrink-0 focus:outline-none',
                isSelected ? 'ring-2 ring-slate-500 dark:ring-slate-300 ring-offset-1 ring-offset-slate-50 dark:ring-offset-slate-800 scale-110' : 'hover:scale-110',
                occupied ? 'opacity-60' : '',
              )}
              style={{ backgroundColor: color }}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                  ✓
                </span>
              )}
              {occupied && (
                <span
                  aria-hidden
                  className="absolute left-1/2 top-1/2 w-7 h-[2px] bg-slate-900/60 dark:bg-white/70 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded"
                />
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-[10px] text-red-600 dark:text-red-400 font-bold">{error}</p>
      )}
      {selectedOccupied && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
          {t.colorYaEnUso}
        </p>
      )}
    </div>
  );
}
