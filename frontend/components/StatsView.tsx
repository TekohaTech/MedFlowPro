import { useState, useEffect } from 'react';
import { ActividadStats } from '../types';
import { api } from '../services/api';
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

interface StatsViewProps {
  onBack: () => void;
  settings: { language: 'es' | 'en'; darkMode: boolean; currency: string };
}

const translations = {
  es: {
    titulo: 'Estadísticas',
    ingresosTotales: 'Ingresos Totales',
    cobrado: 'Cobrado',
    pendiente: 'Pendiente',
    guardias: 'Guardias',
    procedimientos: 'Procedimientos',
    interconsultas: 'Interconsultas',
    mes: 'del mes',
    error: 'Error al cargar estadísticas',
    recargar: 'Recargar',
    loading: 'Cargando...'
  },
  en: {
    titulo: 'Statistics',
    ingresosTotales: 'Total Earnings',
    cobrado: 'Collected',
    pendiente: 'Pending',
    guardias: 'Shifts',
    procedimientos: 'Procedures',
    interconsultas: 'Consultations',
    mes: 'for this month',
    error: 'Error loading statistics',
    recargar: 'Refresh',
    loading: 'Loading...'
  }
};

export function StatsView({ onBack, settings }: StatsViewProps) {
  const [stats, setStats] = useState<ActividadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const t = translations[settings.language];

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: settings.currency === 'USD' ? 'USD' : 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">{t.loading}</p>
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
    { label: t.ingresosTotales, value: formatCurrency(stats.total_ingresos), icon: TrendingUp, color: 'bg-blue-600' },
    { label: t.cobrado, value: formatCurrency(stats.Cobrado), icon: CreditCard, color: 'bg-green-600' },
    { label: t.pendiente, value: formatCurrency(stats.Pendiente), icon: Wallet, color: 'bg-amber-600' },
    { label: t.guardias, value: formatCurrency(stats.total_guardias), icon: Clock, color: 'bg-purple-600' },
    { label: t.procedimientos, value: formatCurrency(stats.total_procedimientos), icon: TrendingUp, color: 'bg-cyan-600' },
    { label: t.interconsultas, value: formatCurrency(stats.total_interconsultas), icon: TrendingUp, color: 'bg-rose-600' },
  ];

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={cn("text-3xl font-black", settings.darkMode ? "text-white" : "text-slate-900")}>
              {t.titulo}
            </h1>
            <p className={cn("text-sm font-medium mt-1", settings.darkMode ? "text-slate-400" : "text-slate-500")}>
              {t.mes}: {stats.mes_actual}/{stats.anio_actual}
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
            ← Volver
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

        {/* Separador */}
        <div className="my-8 border-t border-slate-200 dark:border-slate-700" />

        <ComparisonTable />

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
};