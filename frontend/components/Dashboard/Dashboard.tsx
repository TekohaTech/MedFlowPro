import { useState } from 'react';
import { format } from 'date-fns';
import { Transaction, PaymentStatus, ShiftType, UserProfile, UserSettings } from '../../types';
import { Search, Bell, Plus, PieChart } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { avatarUrl } from '../../lib/avatars';
import { translations } from '../../translations';
import { useNotifications } from '../../hooks/useNotifications';
import { StatsCards } from './StatsCards';
import { MonthlyChart } from './MonthlyChart';
import { TransactionHistory } from './TransactionHistory';
import { NotificationsDropdown } from './NotificationsDropdown';
import { SearchModal } from './SearchModal';
import { PendingPaymentsModal } from './PendingPaymentsModal';
import type { OverlapInfo } from '../Calendar/calendarUtils';

interface DashboardProps {
  transactions: Transaction[];
  insight: string;
  onOpenForm: () => void;
  onViewReports: () => void;
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  userProfile: UserProfile;
  settings: UserSettings;
}

export function Dashboard({
  transactions,
  insight,
  onOpenForm,
  onViewReports,
  onUpdateTransaction,
  userProfile,
  settings,
}: DashboardProps) {
  const t = translations[settings.language];
  const { unreadCount } = useNotifications();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  const pendingTransactions = transactions.filter(t => t.status === PaymentStatus.PENDING);

  const handleMarkAsPaid = async (id: string) => {
    await onUpdateTransaction(id, { status: PaymentStatus.PAID });
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthTxs = transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  const currentMonthTotal = currentMonthTxs.reduce((acc, t) => acc + t.amount, 0);
  const currentMonthCounts = {
    guardias: currentMonthTxs.filter(t => t.type === ShiftType.ACTIVE).length,
    procedimientos: currentMonthTxs.filter(t => t.type === ShiftType.CONSULTATION).length,
    interconsultas: currentMonthTxs.filter(t => t.type === ShiftType.PASSIVE).length,
    extras: currentMonthTxs.filter(t => t.type === ShiftType.EXTRA).length,
  };

  const prevDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();

  const prevMonthTotal = transactions
    .filter(t => {
      const d = new Date(t.date + 'T12:00:00');
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    })
    .reduce((acc, t) => acc + t.amount, 0);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const upcomingShifts = transactions
    .filter((tx) => tx.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextShift = upcomingShifts[0] ?? null;

  const findOverlaps = (txList: Transaction[]): OverlapInfo[] => {
    const results: OverlapInfo[] = [];
    for (let i = 0; i < txList.length; i++) {
      for (let j = i + 1; j < txList.length; j++) {
        const a = txList[i], b = txList[j];
        // skip overlap check when we can't determine end time for either
        if (!a.endTime && !a.endDate) continue;
        if (!b.endTime && !b.endDate) continue;
        const aStart = new Date(`${a.date}T${a.startTime || '00:00'}`);
        const aEnd = new Date(`${a.endDate || a.date}T${a.endTime || '23:59'}`);
        const bStart = new Date(`${b.date}T${b.startTime || '00:00'}`);
        const bEnd = new Date(`${b.endDate || b.date}T${b.endTime || '23:59'}`);
        if (aStart <= bEnd && bStart <= aEnd) {
          const dateLabel = format(aStart > bStart ? aStart : bStart, 'dd/MM');
          results.push({ a, b, dateLabel });
        }
      }
    }
    return results;
  };

  const upcomingOverlaps = findOverlaps(upcomingShifts.slice(0, 10));
  const nextOverlap = upcomingOverlaps[0] ?? null;

  const getMonthlyPerformance = (yr: number) => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(yr, i, 1);
      const label = d.toLocaleString(settings.language === 'es' ? 'es-AR' : 'en-US', { month: 'short' });
      months.push({ label, value: transactions.filter(t => t.date.startsWith(format(d, 'yyyy-MM'))).reduce((s, t) => s + t.amount, 0) });
    }
    return months;
  };

  const monthlyData = getMonthlyPerformance(year);
  const maxVal = Math.max(...monthlyData.map(d => d.value), 1000);


  const filteredTransactions = searchQuery
    ? transactions.filter(tx =>
        tx.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.date.includes(searchQuery)
      )      .slice(0, 10)
    : transactions.slice(0, 20);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-32">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
            <img src={avatarUrl(userProfile.avatar)}
              className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl border-2 border-white dark:border-slate-700 shadow-xl relative z-10 bg-slate-50 dark:bg-slate-800 object-cover" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white dark:border-slate-900 rounded-full z-20" />
          </div>
          <div>
            <h1 className={cn("text-xl lg:text-2xl font-black leading-tight tracking-tight", settings.darkMode ? "text-white" : "text-slate-900")}>
              {t.hola}, {userProfile.name}
            </h1>
            <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{userProfile.specialty}</p>
          </div>
        </div>
        <div className="flex gap-2 lg:gap-3">
          <button onClick={() => setSearchOpen(true)}
            className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 dark:hover:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm group">
            <Search className="w-4 h-4 lg:w-5 lg:h-5" />
          </button>
          <div className="relative">
            <button onClick={() => setShowNotifDropdown(prev => !prev)}
              className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 dark:hover:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm relative group">
              <Bell className="w-4 h-4 lg:w-5 lg:h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 lg:-top-2 lg:-right-2 min-w-[20px] h-5 rounded-full bg-red-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-white px-1 leading-none shadow-lg">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifDropdown && (
              <NotificationsDropdown
                language={settings.language}
                onClose={() => setShowNotifDropdown(false)}
              />
            )}
          </div>
        </div>
      </header>

      <StatsCards
        currentMonthTotal={currentMonthTotal}
        currentMonthCounts={currentMonthCounts}
        prevMonthTotal={prevMonthTotal}
        nextShift={nextShift}
        nextOverlap={nextOverlap}
        onOpenForm={onOpenForm}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <MonthlyChart
          monthlyData={monthlyData}
          year={year}
          currentMonth={currentMonth}
          maxVal={maxVal}
          onYearChange={setYear}
        />

        <div className="space-y-4 lg:space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:gap-6">
            <button onClick={onOpenForm}
              className="flex flex-col items-center justify-center gap-2 lg:gap-4 bg-blue-600 text-white p-5 lg:p-8 rounded-2xl lg:rounded-[2.5rem] font-bold lg:font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all hover:-translate-y-1 active:translate-y-0 group">
              <div className="w-10 lg:w-12 h-10 lg:h-12 bg-white/20 rounded-xl lg:rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-90 group-hover:scale-110">
                <Plus className="w-5 lg:w-6 h-5 lg:h-6" />
              </div>
              <span className="text-sm lg:text-base tracking-tight">{t.nuevoTurno}</span>
            </button>
            <button onClick={onViewReports}
              className="flex flex-col items-center justify-center gap-2 lg:gap-4 bg-gradient-to-br from-white to-sky-50/80 dark:from-slate-800 dark:to-slate-800 border border-sky-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 p-5 lg:p-8 rounded-2xl lg:rounded-[2.5rem] font-bold lg:font-black shadow-lg shadow-sky-100/60 dark:shadow-none transition-all hover:-translate-y-1 active:translate-y-0 group">
              <div className="w-10 lg:w-12 h-10 lg:h-12 bg-sky-50 dark:bg-slate-900 text-sky-500 dark:text-slate-500 rounded-xl lg:rounded-2xl flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900 group-hover:text-blue-600 transition-all">
                <PieChart className="w-5 lg:w-6 h-5 lg:h-6" />
              </div>
              <span className="text-sm lg:text-base tracking-tight">{t.reportes}</span>
            </button>
          </div>

          <TransactionHistory
            transactions={transactions}
            pagadosLabel={t.pagados}
            pendientesLabel={t.pendientes}
            activityLabel={t.actividad}
            emptyLabel={t.sinActividadesRecientes}
            pendingButtonLabel={t.porCobrar}
            pendingButtonTitle={t.verPagosPendientes}
            language={settings.language}
            onOpenPending={() => setPendingOpen(true)}
          />
        </div>
      </div>

      <SearchModal
        open={searchOpen}
        searchQuery={searchQuery}
        results={filteredTransactions}
        placeholder={settings.language === 'es' ? 'Buscar por institución o fecha...' : 'Search by institution or date...'}
        emptyLabel={settings.language === 'es' ? 'Sin resultados' : 'No results'}
        onSearchChange={setSearchQuery}
        onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
      />

      {pendingOpen && (
        <PendingPaymentsModal
          pending={pendingTransactions}
          onMarkAsPaid={handleMarkAsPaid}
          onClose={() => setPendingOpen(false)}
          language={settings.language}
        />
      )}
    </div>
  );
}
