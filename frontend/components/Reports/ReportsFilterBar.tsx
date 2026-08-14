import { Calendar, Building2, Filter } from 'lucide-react';
import { ALL_INSTITUTIONS } from './useReportsFilters';
import type { PeriodFilter } from './useReportsFilters';
import { translations, type Language } from '../../translations';

interface ReportsFilterBarProps {
  periodFilter: PeriodFilter;
  institutionFilter: string;
  activityFilter: string;
  institutions: string[];
  periodLabels: Record<PeriodFilter, string>;
  language: Language;
  onPeriodChange: (v: PeriodFilter) => void;
  onInstitutionChange: (v: string) => void;
  onActivityChange: (v: string) => void;
}

export function ReportsFilterBar({
  periodFilter,
  institutionFilter,
  activityFilter,
  institutions,
  periodLabels,
  language,
  onPeriodChange,
  onInstitutionChange,
  onActivityChange,
}: ReportsFilterBarProps) {
  const t = translations[language];
  const selectClass = "bg-transparent font-medium text-slate-700 dark:text-slate-200 focus:outline-none text-sm";

  return (
    <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-slate-400" />
        <select value={periodFilter} onChange={(e) => onPeriodChange(e.target.value as PeriodFilter)} className={selectClass}>
          <option value="thisMonth">{periodLabels.thisMonth}</option>
          <option value="lastMonth">{periodLabels.lastMonth}</option>
          <option value="thisWeek">{periodLabels.thisWeek}</option>
          <option value="all">{periodLabels.all}</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-slate-400" />
        <select value={institutionFilter} onChange={(e) => onInstitutionChange(e.target.value)} className={selectClass}>
          {institutions.map((inst) => (
            <option key={inst} value={inst}>{inst === ALL_INSTITUTIONS ? t.todas : inst}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
          <select value={activityFilter} onChange={(e) => onActivityChange(e.target.value)} className={selectClass}>
            <option value="Todos">{t.todosLosTipos}</option>
            <option value="guardia">{t.guardias}</option>
            <option value="procedimiento">{t.procedimientos}</option>
            <option value="interconsulta">{t.interconsultas}</option>
            <option value="extra">{t.extras}</option>
          </select>
      </div>
    </div>
  );
}
