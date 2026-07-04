import { format, type Locale } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface CalendarNavProps {
  currentDate: Date;
  locale: Locale;
  t: Record<string, string>;
  embedded?: boolean;
  selectedDay: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  onOpenForm: (date?: string) => void;
}

export function CalendarNav({
  currentDate, locale, t, embedded, selectedDay,
  onPrevMonth, onNextMonth, onGoToToday, onOpenForm,
}: CalendarNavProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
        <button
          onClick={onPrevMonth}
          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <button
          onClick={onGoToToday}
          className="px-4 py-2 text-xs font-black text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
        >
          {t.hoy}
        </button>
        <button
          onClick={onNextMonth}
          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
      </div>
      <h3 className="text-lg font-black text-slate-900 dark:text-white capitalize">
        {format(currentDate, 'MMMM yyyy', { locale })}
      </h3>
      {!embedded && (
        <button
          onClick={() => onOpenForm(format(selectedDay, 'yyyy-MM-dd'))}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-[2rem] font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{t.nuevoTurno}</span>
        </button>
      )}
    </div>
  );
}
