import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonthlyRow } from '../types';
import { api } from '../services/api';
import { cn } from '../lib/utils';

const MONTH_NAMES: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
};

function monthLabel(month: string): string {
  const [, m] = month.split('-');
  return MONTH_NAMES[m] || month;
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-300 dark:text-slate-600 text-[10px]">—</span>;
  if (value > 0) return (
    <span className="text-green-600 dark:text-green-400 text-[10px] font-bold flex items-center gap-1">
      <TrendingUp className="w-3 h-3" />+{value.toFixed(0)}%
    </span>
  );
  if (value < 0) return (
    <span className="text-red-500 dark:text-red-400 text-[10px] font-bold flex items-center gap-1">
      <TrendingDown className="w-3 h-3" />{value.toFixed(0)}%
    </span>
  );
  return (
    <span className="text-slate-400 text-[10px] flex items-center gap-1">
      <Minus className="w-3 h-3" />0%
    </span>
  );
}

export function ComparisonTable() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getMonthlyComparison(year)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [year]);

  const yearTotal = rows.reduce((s, r) => s + r.total_ingresos, 0);
  const yearCobrado = rows.reduce((s, r) => s + r.cobrado, 0);
  const yearPendiente = rows.reduce((s, r) => s + r.pendiente, 0);

  // Calcular delta vs mes anterior
  const rowsWithDelta = rows.map((r, i) => ({
    ...r,
    delta: i > 0 && rows[i - 1].total_ingresos > 0
      ? ((r.total_ingresos - rows[i - 1].total_ingresos) / rows[i - 1].total_ingresos) * 100
      : null,
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 lg:p-5 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/30 border border-slate-200 dark:border-slate-700 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Comparativa Mensual
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setYear(y => y - 1)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-black text-slate-900 dark:text-white min-w-[4rem] text-center">{year}</span>
          <button type="button" onClick={() => setYear(y => Math.min(y + 1, currentYear))}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-[10px] text-slate-400 font-bold">Cargando...</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-[10px] text-slate-400 font-bold">Sin datos para {year}</div>
      ) : (
        <>
          {/* Tabla horizontal scroll en mobile */}
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[600px] text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 pr-3 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-white dark:bg-slate-800 z-10 relative after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-slate-200 dark:after:bg-slate-600">Mes</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gdia</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Proc</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inter</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Extra</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cobrado</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pend.</th>
                  <th className="text-right py-2 pl-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Δ%</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithDelta.map((r) => (
                  <tr key={r.month} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 pr-3 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 z-10 relative after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-slate-200 dark:after:bg-slate-600">{monthLabel(r.month)}</td>
                    <td className="text-right py-2.5 px-2 font-black text-slate-900 dark:text-white">${r.total_ingresos.toLocaleString('es-AR')}</td>
                    <td className="text-right py-2.5 px-2 font-bold text-slate-700 dark:text-slate-300">{r.total_guardias}</td>
                    <td className="text-right py-2.5 px-2 font-bold text-slate-700 dark:text-slate-300">{r.total_procedimientos}</td>
                    <td className="text-right py-2.5 px-2 font-bold text-slate-700 dark:text-slate-300">{r.total_interconsultas}</td>
                    <td className="text-right py-2.5 px-2 font-bold text-slate-700 dark:text-slate-300">{r.total_extras}</td>
                    <td className="text-right py-2.5 px-2 font-bold text-green-600 dark:text-green-400">{r.cobrado > 0 ? `$${r.cobrado.toLocaleString('es-AR')}` : '—'}</td>
                    <td className="text-right py-2.5 px-2 font-bold text-orange-500 dark:text-orange-400">{r.pendiente > 0 ? `$${r.pendiente.toLocaleString('es-AR')}` : '—'}</td>
                    <td className="text-right py-2.5 pl-2"><Delta value={r.delta} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                  <td className="py-2.5 pr-3 font-black text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 relative after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-slate-200 dark:after:bg-slate-600">Total {year}</td>
                  <td className="text-right py-2.5 px-2 font-black text-blue-600 dark:text-blue-400">${yearTotal.toLocaleString('es-AR')}</td>
                  <td className="text-right py-2.5 px-2 font-bold text-slate-700 dark:text-slate-300" colSpan={3} />
                  <td className="text-right py-2.5 px-2 font-black text-green-600 dark:text-green-400">${yearCobrado.toLocaleString('es-AR')}</td>
                  <td className="text-right py-2.5 px-2 font-black text-orange-500 dark:text-orange-400">${yearPendiente.toLocaleString('es-AR')}</td>
                  <td className="text-right py-2.5 pl-2" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold pt-1">
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" /> Subida</span>
            <span className="flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" /> Bajada</span>
            <span className="flex items-center gap-1"><Minus className="w-3 h-3" /> Sin cambio</span>
          </div>
        </>
      )}
    </div>
  );
}
