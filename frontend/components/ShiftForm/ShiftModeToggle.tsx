import { cn } from '../../lib/utils';
import { translations, type Language } from '../../translations';

interface ShiftModeToggleProps {
  isExtra: boolean;
  onModeChange: (mode: 'guardia' | 'extra') => void;
  /** UI language for the mode labels. */
  language: Language;
}

/** Guardia/Extra mode switcher rendered at the top of the ShiftForm. */
export function ShiftModeToggle({ isExtra, onModeChange, language }: ShiftModeToggleProps) {
  const t = translations[language];
  return (
    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
      <button
        type="button"
        onClick={() => onModeChange('guardia')}
        className={cn(
          "flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all",
          !isExtra
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        {t.tipoGuardia}
      </button>
      <button
        type="button"
        onClick={() => onModeChange('extra')}
        className={cn(
          "flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all",
          isExtra
            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        )}
      >
        {t.tipoExtra}
      </button>
    </div>
  );
}
