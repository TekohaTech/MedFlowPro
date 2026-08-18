import { useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { translations, MONTH_NAMES, type Language } from '../translations';
import { useMonthlyComparison } from '../hooks/useMonthlyComparison';
import { Delta } from './Delta';
import { cn } from '../lib/utils';

const stickyCol = "sticky left-0 bg-white dark:bg-slate-800 z-10 relative after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-slate-200 dark:after:bg-slate-600";

function monthLabel(month: string, language: Language): string {
  const [, m] = month.split('-');
  const idx = parseInt(m, 10) - 1;
  return MONTH_NAMES[language][idx] || month;
}

interface ComparisonTableProps {
  language: Language;
}

export function ComparisonTable({ language }: ComparisonTableProps) {
  const t = translations[language];
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { rows, loading } = useMonthlyComparison(year);

  const yearTotal = rows.reduce((s, r) => s + r.total_ingresos, 0);
  const yearCobrado = rows.reduce((s, r) => s + r.cobrado, 0);
  const yearPendiente = rows.reduce((s, r) => s + r.pendiente, 0);

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
            {t.comparativaMensual}
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
        <div className="py-8 text-center text-[10px] text-slate-400 font-bold">{t.cargando}</div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-[10px] text-slate-400 font-bold">{t.sinDatosAnio.replace('{year}', String(year))}</div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[600px] text-[10px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className={cn("text-left py-2 pr-3 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider", stickyCol)}>{t.mesLabel}</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.totalLabel}</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.gdia}</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.proc}</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.inter}</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.extras}</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.cobradoCol}</th>
                  <th className="text-right py-2 px-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.pend}</th>
                  <th className="text-right py-2 pl-2 font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Δ%</th>
                </tr>
              </thead>
              <tbody>
                {rowsWithDelta.map((r) => (
                  <tr key={r.month} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className={cn("py-2.5 pr-3 font-bold text-slate-900 dark:text-white", stickyCol)}>{monthLabel(r.month, language)}</td>
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
                  <td className={cn("py-2.5 pr-3 font-black text-slate-900 dark:text-white", stickyCol)}>{t.totalAnio.replace('{year}', String(year))}</td>
                  <td className="text-right py-2.5 px-2 font-black text-blue-600 dark:text-blue-400">${yearTotal.toLocaleString('es-AR')}</td>
                  <td className="text-right py-2.5 px-2 font-bold text-slate-700 dark:text-slate-300" colSpan={4} />
                  <td className="text-right py-2.5 px-2 font-black text-green-600 dark:text-green-400">${yearCobrado.toLocaleString('es-AR')}</td>
                  <td className="text-right py-2.5 px-2 font-black text-orange-500 dark:text-orange-400">${yearPendiente.toLocaleString('es-AR')}</td>
                  <td className="text-right py-2.5 pl-2" />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold pt-1">
            <span className="flex items-center gap-1"><span className="w-3 h-3 text-green-500">▲</span> {t.subida}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 text-red-500">▼</span> {t.bajada}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3">—</span> {t.sinCambio}</span>
          </div>
        </>
      )}
    </div>
  );
}
