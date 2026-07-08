import { Transaction, PaymentStatus, ShiftType } from '../../types';
import { formatCurrency, formatCurrencyFull } from '../../lib/utils';
import {
  TrendingUp, TrendingDown, PieChart, Clock,
  Activity, Stethoscope, UserCheck, FileText,
} from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { cn } from '../../lib/utils';

interface MonthCounts {
  guardias: number;
  procedimientos: number;
  interconsultas: number;
  extras: number;
}

interface StatsCardsProps {
  currentMonthTotal: number;
  currentMonthCounts: MonthCounts;
  prevMonthTotal: number;
  nextShift: Transaction | null;
  nextOverlapWarning: string | null;
  onOpenForm: () => void;
}

function StatBadge({ count, icon, label }: { count: number; icon: React.ReactNode; label: string }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300">
      {icon}
      {count} {label}
    </span>
  );
}

export function StatsCards({
  currentMonthTotal,
  currentMonthCounts,
  prevMonthTotal,
  nextShift,
  nextOverlapWarning,
  onOpenForm,
}: StatsCardsProps) {
  const now = new Date();
  const currentLabel = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevLabel = prevDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const delta = prevMonthTotal > 0
    ? Math.round(((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100)
    : currentMonthTotal > 0 ? 100 : 0;

  const isUp = delta >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      <DashboardCard>
        <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-6">
          <div className="w-10 lg:w-12 h-10 lg:h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl lg:rounded-2xl flex items-center justify-center">
            <Activity className="w-5 lg:w-6 h-5 lg:h-6" />
          </div>
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Actividades del Mes
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatBadge count={currentMonthCounts.guardias} icon={<Clock className="w-3.5 h-3.5" />} label="guardias" />
          <StatBadge count={currentMonthCounts.procedimientos} icon={<Stethoscope className="w-3.5 h-3.5" />} label="procedimientos" />
          <StatBadge count={currentMonthCounts.interconsultas} icon={<UserCheck className="w-3.5 h-3.5" />} label="interconsultas" />
          <StatBadge count={currentMonthCounts.extras} icon={<FileText className="w-3.5 h-3.5" />} label="extras" />
        </div>
        {currentMonthCounts.guardias + currentMonthCounts.procedimientos + currentMonthCounts.interconsultas + currentMonthCounts.extras === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Sin actividades este mes</p>
        )}
      </DashboardCard>

      <DashboardCard className="bg-slate-900 dark:bg-slate-800 text-white flex flex-col">
        <div className="flex items-center gap-2 lg:gap-3 mb-4 lg:mb-6">
          <div className="w-10 lg:w-12 h-10 lg:h-12 bg-white/10 text-white rounded-xl lg:rounded-2xl flex items-center justify-center">
            <PieChart className="w-5 lg:w-6 h-5 lg:h-6" />
          </div>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Comparativa
          </span>
        </div>
        <div className="flex-1 space-y-4 lg:space-y-5">
          <div>
            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-0.5">
              Este mes
            </p>
            <p className="text-[8px] lg:text-[9px] font-bold text-white/40 uppercase tracking-wide mb-1">
              {currentLabel}
            </p>
            <span
              className="text-2xl lg:text-3xl font-black tracking-tighter block"
              title={formatCurrencyFull(currentMonthTotal)}
            >
              {formatCurrency(currentMonthTotal)}
            </span>
          </div>
          <div className="border-t border-white/10 pt-4 lg:pt-5">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">
              Mes pasado
            </p>
            <p className="text-[8px] lg:text-[9px] font-bold text-white/40 uppercase tracking-wide mb-1">
              {prevLabel}
            </p>
            <span
              className="text-xl lg:text-2xl font-black text-slate-300 tracking-tighter block"
              title={formatCurrencyFull(prevMonthTotal)}
            >
              {formatCurrency(prevMonthTotal)}
            </span>
          </div>
        </div>
        <div className="mt-auto pt-4 lg:pt-5 border-t border-white/10">
          <div className="flex items-center gap-2 mb-2 lg:mb-3">
            <div className={cn(
              "flex items-center gap-1.5 text-xs lg:text-sm font-black",
              isUp ? "text-green-400" : "text-red-400",
            )}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> : <TrendingDown className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
              {isUp ? '+' : ''}{delta}% vs mes anterior
            </div>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                isUp ? "bg-green-500" : "bg-red-500",
              )}
              style={{ width: `${Math.min(100, prevMonthTotal > 0 ? (currentMonthTotal / prevMonthTotal) * 100 : 100)}%` }}
            />
          </div>
        </div>
      </DashboardCard>

      <DashboardCard className="bg-blue-600 text-white shadow-xl shadow-blue-500/20">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">
              {nextShift?.type === ShiftType.EXTRA ? 'Próximo Extra'
                : nextShift?.type === ShiftType.CONSULTATION ? 'Próximo Procedimiento'
                : 'Próxima Guardia'}
            </p>
            <div className="w-10 lg:w-12 h-10 lg:h-12 bg-white/20 rounded-xl lg:rounded-2xl flex items-center justify-center">
              <Clock className="w-5 lg:w-6 h-5 lg:h-6" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg lg:text-2xl font-black tracking-tight leading-tight truncate">
              {nextShift ? nextShift.institution : 'Sin guardias'}
            </h3>
            {nextShift && (
              <>
                <p className="text-blue-100 font-bold mt-1 text-xs tracking-widest">
                  {new Date(nextShift.date + 'T12:00:00').toLocaleDateString('es-AR', {
                    weekday: 'short', day: 'numeric', month: 'short'
                  })}
                  {nextShift.startTime && <> · {nextShift.startTime}</>}
                </p>
                {(() => {
                  const hasDuration = nextShift.endTime || nextShift.endDate;
                  if (!hasDuration) return null;
                  const startD = new Date(`${nextShift.date}T${nextShift.startTime || '08:00'}`);
                  const endD = new Date(`${nextShift.endDate || nextShift.date}T${nextShift.endTime || '08:00'}`);
                  const totalH = Math.round((endD.getTime() - startD.getTime()) / 3600000);
                  if (totalH <= 0) return null;
                  const isGuardia = nextShift.type === ShiftType.ACTIVE || nextShift.type === ShiftType.PASSIVE;
                  return (
                    <>
                      <p className="text-blue-200 text-xs font-bold mt-2">
                        {totalH} hs{isGuardia ? ' de guardia' : ''}
                      </p>
                      <p className="text-blue-100 text-xs font-black mt-0.5">
                        {nextShift.startTime || '08:00'} → {nextShift.endTime || '08:00'}
                        {nextShift.endDate && nextShift.endDate !== nextShift.date
                          ? ` · ${new Date(nextShift.endDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}`
                          : ''}
                      </p>
                      <p className="text-blue-100/70 text-xs font-bold mt-1.5">
                        Libre desde las {nextShift.endTime || '08:00'}
                      </p>
                    </>
                  );
                })()}
                <div className="flex items-center gap-2 mt-4 lg:mt-6">
                  <span className="bg-white/20 px-2 lg:px-3 py-1 text-xs font-black rounded-lg uppercase">
                    {nextShift.type === ShiftType.EXTRA ? 'Extra'
                      : nextShift.type === ShiftType.ACTIVE ? 'Guardia'
                      : nextShift.type === ShiftType.CONSULTATION ? 'Procedimiento'
                      : nextShift.type === ShiftType.PASSIVE ? 'Interconsulta'
                      : nextShift.type}
                  </span>
                  <span className="bg-white/20 px-2 lg:px-3 py-1 text-xs font-black rounded-lg uppercase">
                    {nextShift.status === PaymentStatus.PAID ? 'Pagado' : 'Pendiente'}
                  </span>
                </div>
              </>
            )}
            {nextOverlapWarning && (
              <div className="mt-2 bg-red-500/30 px-2 lg:px-3 py-1 rounded-lg text-xs font-black text-white">
                {'\u26A0'} Superposición: {nextOverlapWarning}
              </div>
            )}
          </div>
          {!nextShift && (
            <button
              onClick={onOpenForm}
              className="mt-3 lg:mt-4 text-xs font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 p-2 rounded-xl text-center"
            >
              Programar ahora
            </button>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}
