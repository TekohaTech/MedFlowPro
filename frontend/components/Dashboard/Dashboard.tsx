import { format } from 'date-fns';
import { Plus, PieChart } from 'lucide-react';
import { Transaction, PaymentStatus, ShiftType, UserProfile, UserSettings } from '../../types';
import { translations } from '../../translations';
import { useNotifications } from '../../hooks/useNotifications';
import { useDashboardState } from '../../hooks/useDashboardState';
import { findOverlaps } from '../Calendar/calendarUtils';
import { DashboardHeader } from './DashboardHeader';
import { StatsCards } from './StatsCards';
import { MonthlyChart } from './MonthlyChart';
import { TransactionHistory } from './TransactionHistory';
import { SearchModal } from './SearchModal';
import { PendingPaymentsModal } from './PendingPaymentsModal';

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
  const {
    searchOpen,
    setSearchOpen,
    searchQuery,
    setSearchQuery,
    year,
    setYear,
    showNotifDropdown,
    setShowNotifDropdown,
    pendingOpen,
    setPendingOpen,
    closeSearch,
  } = useDashboardState();

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
      ).slice(0, 10)
    : transactions.slice(0, 20);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-32">
      <DashboardHeader
        userProfile={userProfile}
        darkMode={settings.darkMode}
        greeting={`${t.hola}, ${userProfile.name}`}
        unreadCount={unreadCount}
        language={settings.language}
        showNotifDropdown={showNotifDropdown}
        onOpenSearch={() => setSearchOpen(true)}
        onToggleNotifications={() => setShowNotifDropdown(prev => !prev)}
        onCloseNotifications={() => setShowNotifDropdown(false)}
      />

      <StatsCards
        currentMonthTotal={currentMonthTotal}
        currentMonthCounts={currentMonthCounts}
        prevMonthTotal={prevMonthTotal}
        nextShift={nextShift}
        nextOverlap={nextOverlap}
        onOpenForm={onOpenForm}
        language={settings.language}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <MonthlyChart
          monthlyData={monthlyData}
          year={year}
          currentMonth={currentMonth}
          maxVal={maxVal}
          language={settings.language}
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
        placeholder={t.buscarActividad}
        emptyLabel={t.sinResultados}
        onSearchChange={setSearchQuery}
        onClose={closeSearch}
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
