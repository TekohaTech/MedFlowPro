import { Transaction, PaymentStatus } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { TrendingUp, Clock, Stethoscope, UserCheck, FileText, BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';
import { translations, type Language } from '../../translations';

interface ReportsStatsCardsProps {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalGuardias: number;
  totalProcedimientos: number;
  totalInterconsultas: number;
  totalExtras: number;
  filteredActividades: Transaction[];
  language?: Language;
}

export function ReportsStatsCards({
  totalInvoiced,
  totalPaid,
  totalPending,
  totalGuardias,
  totalProcedimientos,
  totalInterconsultas,
  totalExtras,
  filteredActividades,
  language = 'es',
}: ReportsStatsCardsProps) {
  const t = translations[language];
  const typeCards = [
    { label: t.totalLabel, value: totalInvoiced, icon: TrendingUp, color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
    { label: t.gdia, value: totalGuardias, icon: Clock, color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' },
    { label: t.proc, value: totalProcedimientos, icon: Stethoscope, color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
    { label: t.inter, value: totalInterconsultas, icon: UserCheck, color: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
    { label: t.extras, value: totalExtras, icon: FileText, color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {typeCards.map((card, i) => (
          <Card key={i} shadow="lg" padding="sm">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
                <card.icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">{card.label}</span>
            </div>
            <p className="text-base lg:text-xl font-black text-slate-900 dark:text-white truncate">
              {formatCurrency(card.value)}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-600 p-4 lg:p-6 rounded-2xl text-white shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase opacity-70">{t.cobrado}</span>
          </div>
          <p className="text-base lg:text-2xl font-black truncate">{formatCurrency(totalPaid)}</p>
          <p className="text-xs mt-2 opacity-60">
            {filteredActividades.filter(a => a.status === PaymentStatus.PAID).length} {t.actividadesCobradas}
          </p>
        </div>
        <div className="bg-orange-500 p-4 lg:p-6 rounded-2xl text-white shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase opacity-70">{t.pendienteLabel}</span>
          </div>
          <p className="text-base lg:text-2xl font-black truncate">{formatCurrency(totalPending)}</p>
          <p className="text-xs mt-2 opacity-60">
            {filteredActividades.filter(a => a.status === PaymentStatus.PENDING).length} {t.actividadesPendientes}
          </p>
        </div>
      </div>
    </>
  );
}
