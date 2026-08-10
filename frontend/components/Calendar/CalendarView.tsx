import { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { X, Printer } from 'lucide-react';
import { Transaction, PaymentStatus, UserSettings } from '../../types';
import { cn } from '../../lib/utils';
import { translations } from '../../translations';
import { CalendarNav } from './CalendarNav';
import { CalendarGrid } from './CalendarGrid';
import { DayDetailsPanel } from './DayDetailsPanel';
import { getShiftsForDay, findOverlaps } from './calendarUtils';
import type { OverlapInfo } from './calendarUtils';

interface CalendarViewProps {
  transactions: Transaction[];
  onOpenForm: (date?: string, tx?: Transaction) => void;
  onDelete: (id: string) => void;
  settings: UserSettings;
  embedded?: boolean;
  onViewReports?: () => void;
}

export function CalendarView({ transactions, onOpenForm, onDelete, settings, embedded, onViewReports }: CalendarViewProps) {
  const t = translations[settings.language];
  const locale = settings.language === 'es' ? es : enUS;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [showDayModal, setShowDayModal] = useState(false);

  const selectedDayShifts = getShiftsForDay(selectedDay, transactions);

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    if (window.innerWidth < 1024) {
      setShowDayModal(true);
    }
  };

  // En móvil la selección es EFÍMERA: solo dura mientras el modal está abierto.
  // Al cerrar sin guardar, volvemos al día actual para que el calendario no
  // quede "tildado" en azul con un día sin datos (confunde con el día de hoy).
  const closeDayModal = () => {
    setShowDayModal(false);
    if (window.innerWidth < 1024) {
      setSelectedDay(new Date());
    }
  };

  const monthSummary = useMemo(() => {
    const monthStr = format(currentDate, 'yyyy-MM');
    const monthTx = transactions.filter(tx => tx.date.startsWith(monthStr));
    const total = monthTx.reduce((s, t) => s + t.amount, 0);
    const paid = monthTx.filter(t => t.status === PaymentStatus.PAID).reduce((s, t) => s + t.amount, 0);
    const pending = monthTx.filter(t => t.status === PaymentStatus.PENDING).reduce((s, t) => s + t.amount, 0);
    const overlaps = findOverlaps(monthTx);
    return { total, paid, pending, count: monthTx.length, overlaps };
  }, [transactions, currentDate]);

  const content = (
    <>
      <CalendarNav
        currentDate={currentDate}
        locale={locale}
        t={t}
        embedded={embedded}
        selectedDay={selectedDay}
        onPrevMonth={() => setCurrentDate(subMonths(currentDate, 1))}
        onNextMonth={() => setCurrentDate(addMonths(currentDate, 1))}
        onGoToToday={() => { const now = new Date(); setCurrentDate(now); setSelectedDay(now); }}
        onOpenForm={onOpenForm}
      />

      {monthSummary.overlaps.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 mb-4 space-y-2">
          <p className="text-[10px] font-black text-red-600 uppercase tracking-wider">
            ⚠ {monthSummary.overlaps.length} superposición{monthSummary.overlaps.length > 1 ? 'es' : ''} detectada{monthSummary.overlaps.length > 1 ? 's' : ''}
          </p>
          {monthSummary.overlaps.map((o: OverlapInfo, i: number) => (
            <div key={i} className="text-[9px] text-red-500 dark:text-red-400 leading-relaxed">
              <span className="font-bold">{o.a.institution}</span> — {o.a.date}
              {o.a.startTime && <span> {o.a.startTime}–{o.a.endTime || '?'}</span>}
              {' ↔ '}
              <span className="font-bold">{o.b.institution}</span> — {o.b.date}
              {o.b.startTime && <span> {o.b.startTime}–{o.b.endTime || '?'}</span>}
              {o.a.institution === o.b.institution && o.a.date === o.b.date && (
                <span className="text-red-400 ml-1">(mismo día, horarios se solapan)</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          <CalendarGrid
            transactions={transactions}
            currentDate={currentDate}
            selectedDay={selectedDay}
            locale={locale}
            t={t}
            onDayClick={handleDayClick}
          />
        </div>

        <div className="hidden lg:block lg:col-span-4 sticky top-10">
          <DayDetailsPanel
            key={selectedDay.toISOString()}
            selectedDay={selectedDay}
            shifts={selectedDayShifts}
            t={t}
            locale={locale}
            onOpenForm={onOpenForm}
            onDelete={onDelete}
          />
        </div>
      </div>

      {showDayModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[110] flex items-end sm:items-center animate-in fade-in duration-300" onClick={(e) => { if (e.target === e.currentTarget) closeDayModal(); }}>
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-[3rem] h-[85vh] sm:h-auto sm:max-h-[80vh] rounded-t-[3rem] p-6 lg:p-8 pt-6 flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden pb-safe" style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}>
            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto mb-6" onClick={closeDayModal} />
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                {format(selectedDay, 'EEEE d', { locale })}
              </h2>
              <button onClick={closeDayModal} className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
              <DayDetailsPanel
                selectedDay={selectedDay}
                shifts={selectedDayShifts}
                t={t}
                locale={locale}
                onOpenForm={(date, tx) => {
                  setShowDayModal(false);
                  if (window.innerWidth < 1024) setSelectedDay(new Date());
                  onOpenForm(date, tx);
                }}
                onDelete={onDelete}
                isModal
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="p-4 lg:p-10 max-w-7xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 lg:mb-0">
        <div className="flex items-center justify-between md:justify-start gap-3">
          <div>
            <h1 className={cn("text-2xl lg:text-4xl font-black tracking-tight leading-none", settings.darkMode ? "text-white" : "text-slate-900")}>{t.guardias}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[9px] lg:text-[10px] mt-2 opacity-80">
              {format(currentDate, 'MMMM yyyy', { locale })}
            </p>
          </div>
          {onViewReports && (
            <button
              onClick={onViewReports}
              className="md:hidden w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm shrink-0"
              title={t.reportes || 'Reportes'}
            >
              <Printer className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="hidden md:flex gap-2">
          {onViewReports && (
            <button
              onClick={onViewReports}
              className="text-[10px] lg:text-xs font-black uppercase tracking-widest bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-3 lg:px-5 lg:py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <Printer className="w-4 h-4 inline mr-1.5" />
              {t.reportes || 'Reportes'}
            </button>
          )}
          <button
            onClick={() => onOpenForm()}
            className="text-[10px] lg:text-xs font-black uppercase tracking-widest bg-blue-600 text-white px-5 py-3 lg:px-6 lg:py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            + {t.nuevoTurno}
          </button>
        </div>
      </header>
      {content}
    </div>
  );
}
