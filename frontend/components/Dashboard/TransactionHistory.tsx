import { Transaction, PaymentStatus, ShiftType } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Clock, Stethoscope, UserCheck, FileText } from 'lucide-react';
import { DashboardCard } from './DashboardCard';

interface TransactionHistoryProps {
  transactions: Transaction[];
  pagadosLabel: string;
  pendientesLabel: string;
  activityLabel: string;
  emptyLabel: string;
  language: string;
  onOpenPending?: () => void;
}

const TYPE_ICON: Record<string, typeof Clock> = {
  [ShiftType.ACTIVE]: Clock,
  [ShiftType.CONSULTATION]: Stethoscope,
  [ShiftType.PASSIVE]: UserCheck,
  [ShiftType.EXTRA]: FileText,
};

function getTypeIcon(type: ShiftType) {
  return TYPE_ICON[type] || Clock;
}

function formatTxDate(dateStr: string, locale: typeof es | undefined): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return format(d, 'EEE d MMM', { locale });
  } catch {
    return dateStr;
  }
}

function isSameMonth(dateStr: string, year: number, month: number): boolean {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getFullYear() === year && d.getMonth() === month;
}

function isPastMonth(dateStr: string, year: number, month: number): boolean {
  const d = new Date(dateStr + 'T12:00:00');
  if (d.getFullYear() < year) return true;
  if (d.getFullYear() === year && d.getMonth() < month) return true;
  return false;
}

export function TransactionHistory({
  transactions,
  pagadosLabel,
  pendientesLabel,
  activityLabel,
  emptyLabel,
  language,
  onOpenPending,
}: TransactionHistoryProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const locale = language === 'es' ? es : undefined;

  // Filter: current month → all; past months → only pending
  const visible = transactions.filter(tx => {
    if (isSameMonth(tx.date, currentYear, currentMonth)) return true;
    if (isPastMonth(tx.date, currentYear, currentMonth)) return tx.status === PaymentStatus.PENDING;
    return false;
  });

  // Sort: pending first, then by date desc within each group
  const sorted = [...visible].sort((a, b) => {
    const aPending = a.status === PaymentStatus.PENDING ? 0 : 1;
    const bPending = b.status === PaymentStatus.PENDING ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    return b.date.localeCompare(a.date);
  });

  const pendingCount = sorted.filter(tx => tx.status === PaymentStatus.PENDING).length;

  return (
    <DashboardCard>
      <div className="flex items-center justify-between mb-5 lg:mb-8">
        <div className="flex items-center gap-2">
          <h3 className="text-lg lg:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {activityLabel}
          </h3>
          {pendingCount > 0 && (
            <button
              onClick={onOpenPending}
              className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-bold rounded-full hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors cursor-pointer"
            >
              {pendingCount}
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[380px] overflow-y-auto overscroll-contain space-y-4 lg:space-y-6">
        {sorted.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-4">{emptyLabel}</p>
        ) : (
          sorted.map(tx => {
            const Icon = getTypeIcon(tx.type);
            const isPending = tx.status === PaymentStatus.PENDING;
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3 lg:gap-5">
                  <div
                    className={cn(
                      "w-12 lg:w-14 h-12 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center transition-all group-hover:scale-105",
                      tx.status === PaymentStatus.PAID
                        ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        : "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
                    )}
                  >
                    <Icon className="w-5 lg:w-6 h-5 lg:h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate max-w-[120px] lg:max-w-[140px] tracking-tight">
                      {tx.institution}
                    </h4>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">
                      {formatTxDate(tx.date, locale)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      "block font-bold text-sm tracking-tight",
                      isPending
                        ? "text-slate-900 dark:text-white"
                        : "text-green-600 dark:text-green-400",
                    )}
                  >
                    {!isPending ? "+" : ""}
                    {formatCurrency(tx.amount)}
                  </span>
                  <span
                    className={cn(
                      "text-[8px] lg:text-[9px] font-medium uppercase tracking-widest",
                      isPending ? "text-orange-600" : "text-green-600",
                    )}
                  >
                    {isPending ? pendientesLabel : pagadosLabel}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </DashboardCard>
  );
}
