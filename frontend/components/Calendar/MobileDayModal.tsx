import { format, type Locale } from 'date-fns';
import { X } from 'lucide-react';
import { Transaction, Institution } from '../../types';
import { DayDetailsPanel } from './DayDetailsPanel';

interface MobileDayModalProps {
  selectedDay: Date;
  shifts: Transaction[];
  institutions: Institution[];
  t: Record<string, string>;
  locale: Locale;
  onOpenForm: (date?: string, tx?: Transaction) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/** Bottom-sheet day detail modal used on mobile (< 1024px) calendar taps. */
export function MobileDayModal({
  selectedDay, shifts, institutions, t, locale, onOpenForm, onDelete, onClose,
}: MobileDayModalProps) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[110] flex items-end sm:items-center p-3 sm:p-6 animate-in fade-in duration-300"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-[2.5rem] h-[80vh] sm:h-auto sm:max-h-[80vh] p-6 lg:p-8 pt-6 flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden pb-safe"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
      >
        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto mb-6" onClick={onClose} />
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            {format(selectedDay, 'EEEE d', { locale })}
          </h2>
          <button onClick={onClose} className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
          <DayDetailsPanel
            selectedDay={selectedDay}
            shifts={shifts}
            institutions={institutions}
            t={t}
            locale={locale}
            onOpenForm={onOpenForm}
            onDelete={onDelete}
            isModal
          />
        </div>
      </div>
    </div>
  );
}
