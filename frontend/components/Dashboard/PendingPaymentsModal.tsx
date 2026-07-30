import { useState } from 'react';
import { Transaction, PaymentStatus } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { X, Check, Loader2, CreditCard, CheckCheck } from 'lucide-react';

interface PendingPaymentsModalProps {
  pending: Transaction[];
  onMarkAsPaid: (id: string) => Promise<void>;
  onClose: () => void;
}

export function PendingPaymentsModal({ pending, onMarkAsPaid, onClose }: PendingPaymentsModalProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // Sort: oldest first
  const sorted = [...pending].sort((a, b) => a.date.localeCompare(b.date));

  const handleMarkAsPaid = async (id: string) => {
    setLoading(id);
    try {
      await onMarkAsPaid(id);
    } finally {
      setLoading(null);
    }
  };

  const handleMarkAllAsPaid = async () => {
    setMarkingAll(true);
    for (const tx of sorted) {
      await onMarkAsPaid(tx.id);
    }
    setMarkingAll(false);
  };

  const totalPending = sorted.reduce((acc, tx) => acc + tx.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-2xl lg:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom lg:slide-in-from-bottom-0 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Pagos Pendientes
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {sorted.length} actividad{sorted.length !== 1 ? 'es' : ''} · {formatCurrency(totalPending)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cobrar todo button */}
        {sorted.length > 0 && (
          <div className="px-4 lg:px-6 pt-4">
            <button
              onClick={handleMarkAllAsPaid}
              disabled={markingAll}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all",
                "bg-emerald-600 hover:bg-emerald-700 text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {markingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              {markingAll ? 'Cobrando todas...' : `Cobrar todas (${formatCurrency(totalPending)})`}
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6 space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                No hay pagos pendientes
              </p>
            </div>
          ) : (
            sorted.map(tx => (
              <div
                key={tx.id}
                className={cn(
                  "flex items-center justify-between p-3 lg:p-4 rounded-xl transition-all",
                  "bg-slate-50 dark:bg-slate-700/50",
                  loading === tx.id && "opacity-50"
                )}
              >
                <div className="flex-1 min-w-0 mr-3">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                    {tx.institution}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">
                    {(() => {
                      try {
                        return format(new Date(tx.date + 'T12:00:00'), 'EEE d MMM', { locale: es });
                      } catch {
                        return tx.date;
                      }
                    })()}
                    {tx.startTime && <> · {tx.startTime}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-slate-900 dark:text-white whitespace-nowrap">
                    {formatCurrency(tx.amount)}
                  </span>
                  <button
                    onClick={() => handleMarkAsPaid(tx.id)}
                    disabled={loading === tx.id}
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                      "hover:bg-emerald-200 dark:hover:bg-emerald-800/40",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading === tx.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
