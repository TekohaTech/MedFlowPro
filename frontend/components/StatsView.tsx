import { 
  TrendingUp, 
  Wallet, 
  Clock, 
  CreditCard,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ComparisonTable } from './ComparisonTable';
import { translations, type Language } from '../translations';
import { useStats } from '../hooks/useStats';

interface StatsViewProps {
  onBack: () => void;
  settings: { language: Language; darkMode: boolean; currency: string };
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'ARS',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function StatsView({ onBack, settings }: StatsViewProps) {
  const t = translations[settings.language];
  const { stats, loading, error, fetchStats } = useStats();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">{t.cargando}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={fetchStats}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl"
          >
            {t.recargar}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: t.ingresosTotales, value: formatCurrency(stats.total_ingresos, settings.currency), icon: TrendingUp, color: 'bg-blue-600' },
    { label: t.cobrado, value: formatCurrency(stats.Cobrado, settings.currency), icon: CreditCard, color: 'bg-green-600' },
    { label: t.pendienteLabel, value: formatCurrency(stats.Pendiente, settings.currency), icon: Wallet, color: 'bg-amber-600' },
    { label: t.guardias, value: formatCurrency(stats.total_guardias, settings.currency), icon: Clock, color: 'bg-purple-600' },
    { label: t.procedimientos, value: formatCurrency(stats.total_procedimientos, settings.currency), icon: TrendingUp, color: 'bg-cyan-600' },
    { label: t.interconsultas, value: formatCurrency(stats.total_interconsultas, settings.currency), icon: TrendingUp, color: 'bg-rose-600' },
  ];

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={cn("text-3xl font-black", settings.darkMode ? "text-white" : "text-slate-900")}>
              {t.estadisticas}
            </h1>
            <p className={cn("text-sm font-medium mt-1", settings.darkMode ? "text-slate-400" : "text-slate-500")}>
              {t.mesDel}: {stats.mes_actual}/{stats.anio_actual}
            </p>
          </div>
          <button
            onClick={onBack}
            className={cn(
              "px-6 py-3 rounded-xl font-bold transition-all",
              settings.darkMode 
                ? "bg-slate-800 text-white hover:bg-slate-700" 
                : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            )}
          >
            {t.volver}
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className={cn(
                "rounded-2xl p-4 lg:p-6 shadow-xl shadow-slate-200/50 border border-slate-200 min-w-0",
                settings.darkMode ? "bg-slate-800 dark:border-slate-700" : "bg-white"
              )}
            >
              <div className={cn("w-8 h-8 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center mb-3 lg:mb-4", card.color)}>
                <card.icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </div>
              <p className={cn("text-[10px] lg:text-xs font-bold uppercase tracking-wider mb-1", settings.darkMode ? "text-slate-400" : "text-slate-500")}>
                {card.label}
              </p>
              <p className={cn("text-base md:text-lg lg:text-2xl font-black truncate", settings.darkMode ? "text-white" : "text-slate-900")}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="my-8 border-t border-slate-200 dark:border-slate-700" />

        <ComparisonTable language={settings.language} />

        <button
          onClick={fetchStats}
          className={cn(
            "mt-8 px-6 py-3 rounded-xl font-bold transition-all",
            settings.darkMode 
              ? "bg-slate-800 text-white hover:bg-slate-700" 
              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
          )}
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          {t.recargar}
        </button>
      </div>
    </div>
  );
}
