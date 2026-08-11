import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthlyChartHeaderProps {
  title: string;
  subtitle: string;
  year: number;
  onYearChange: (year: number) => void;
}

export function MonthlyChartHeader({ title, subtitle, year, onYearChange }: MonthlyChartHeaderProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-lg lg:text-xl font-black tracking-tight text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="text-[9px] lg:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onYearChange(year - 1)}
          className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <span className="text-sm font-black text-slate-900 dark:text-white min-w-[44px] text-center">
          {year}
        </span>
        <button
          onClick={() => onYearChange(year + 1)}
          disabled={year >= currentYear}
          className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
      </div>
    </div>
  );
}
