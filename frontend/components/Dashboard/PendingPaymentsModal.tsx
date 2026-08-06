import { useState } from 'react';
import { Transaction } from '../../types';
import { formatCurrency, cn } from '../../lib/utils';
import { format, type Locale } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { X, Check, Loader2, CreditCard, CheckCheck, Search, SearchX } from 'lucide-react';
import { translations, type Language } from '../../translations';

interface PendingPaymentsModalProps {
  pending: Transaction[];
  onMarkAsPaid: (id: string) => Promise<void>;
  onClose: () => void;
  language: Language;
}

function formatModalDate(dateStr: string, locale: Locale): string {
  try {
    return format(new Date(dateStr + 'T12:00:00'), 'EEE d MMM', { locale });
  } catch {
    return dateStr;
  }
}

function normalizeAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchesSearch(tx: Transaction, query: string, locale: Locale): boolean {
  const q = normalizeAccents(query.trim().toLowerCase());
  if (!q) return true;
  const haystack = normalizeAccents(
    [
      tx.institution,
      formatModalDate(tx.date, locale),
      tx.date,
      String(tx.amount),
      formatCurrency(tx.amount),
    ]
      .join(' ')
      .toLowerCase()
  );
  return haystack.includes(q);
}

export function PendingPaymentsModal({ pending, onMarkAsPaid, onClose, language }: PendingPaymentsModalProps) {
  const t = translations[language];
  const locale = language === 'es' ? es : enUS;
  const [loading, setLoading] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [query, setQuery] = useState('');

  // Sort: oldest first
  const sorted = [...pending].sort((a, b) => a.date.localeCompare(b.date));
  const filtered = query.trim() ? sorted.filter(tx => matchesSearch(tx, query, locale)) : sorted;

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
    for (const tx of filtered) {
      await onMarkAsPaid(tx.id);
    }
    setMarkingAll(false);
  };

  const totalPending = sorted.reduce((acc, tx) => acc + tx.amount, 0);
  const markAllTotal = filtered.reduce((acc, tx) => acc + tx.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-t-2xl lg:rounded-2xl max-h-[85dvh] pb-[max(env(safe-area-inset-bottom),0.5rem)] flex flex-col shadow-2xl animate-in slide-in-from-bottom lg:slide-in-from-bottom-0 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {t.pagosPendientes}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {sorted.length} {sorted.length === 1 ? t.actividadSingular : t.actividadPlural} · {formatCurrency(totalPending)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t.cerrar}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + Cobrar todas */}
        {sorted.length > 0 && (
          <div className="px-4 lg:px-6 pt-4 space-y-3">
            <label className="relative block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.buscarPagos}
                aria-label={t.buscarPagos}
                className={cn(
                  "w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border",
                  "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600",
                  "text-slate-900 dark:text-white placeholder:text-slate-400",
                  "focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30",
                  "transition-all"
                )}
              />
            </label>
            <button
              onClick={handleMarkAllAsPaid}
              disabled={markingAll || filtered.length === 0}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all",
                "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25",
                "active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {markingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              {markingAll ? t.cobrandoTodas : `${t.cobrarTodas} (${formatCurrency(markAllTotal)})`}
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6 space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                {t.noHayPagosPendientes}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <SearchX className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                {t.sinResultados}
              </p>
            </div>
          ) : (
            filtered.map(tx => (
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
                    {formatModalDate(tx.date, locale)}
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
                    aria-label={t.marcarCobrado}
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                      "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
                      "hover:bg-orange-200 dark:hover:bg-orange-800/40 active:scale-95",
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
