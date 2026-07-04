import { Transaction, PaymentStatus } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { TrendingUp, Clock, Stethoscope, UserCheck, BarChart3 } from 'lucide-react';
import { Card } from '../ui/Card';

interface ReportsStatsCardsProps {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalGuardias: number;
  totalProcedimientos: number;
  totalInterconsultas: number;
  filteredActividades: Transaction[];
}

export function ReportsStatsCards({
  totalInvoiced,
  totalPaid,
  totalPending,
  totalGuardias,
  totalProcedimientos,
  totalInterconsultas,
  filteredActividades,
}: ReportsStatsCardsProps) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card shadow="lg" padding="sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">Total</span>
          </div>
          <p className="text-base md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white truncate">{formatCurrency(totalInvoiced)}</p>
        </Card>
        <Card shadow="lg" padding="sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Guardias</span>
          </div>
          <p className="text-base md:text-xl lg:text-2xl font-black text-slate-900 dark:text-white truncate">{formatCurrency(totalGuardias)}</p>
        </Card>
        <Card shadow="lg" padding="sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
              <Stethoscope className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Proced.</span>
          </div>
          <p className="text-base md:text-xl lg:text-2xl font-black text-slate-900 dark:text-white truncate">{formatCurrency(totalProcedimientos)}</p>
        </Card>
        <Card shadow="lg" padding="sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Intercons.</span>
          </div>
          <p className="text-base md:text-xl lg:text-2xl font-black text-slate-900 dark:text-white truncate">{formatCurrency(totalInterconsultas)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-600 p-6 rounded-2xl text-white shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase opacity-70">Cobrado</span>
          </div>
          <p className="text-xl md:text-2xl lg:text-3xl font-black truncate">{formatCurrency(totalPaid)}</p>
          <p className="text-xs mt-2 opacity-60">
            {filteredActividades.filter(a => a.status === PaymentStatus.PAID).length} actividades cobradas
          </p>
        </div>
        <div className="bg-orange-500 p-6 rounded-2xl text-white shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase opacity-70">Pendiente</span>
          </div>
          <p className="text-xl md:text-2xl lg:text-3xl font-black truncate">{formatCurrency(totalPending)}</p>
          <p className="text-xs mt-2 opacity-60">
            {filteredActividades.filter(a => a.status === PaymentStatus.PENDING).length} actividades pendientes
          </p>
        </div>
      </div>
    </>
  );
}
