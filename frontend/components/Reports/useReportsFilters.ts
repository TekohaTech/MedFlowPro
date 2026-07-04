import { useState, useMemo } from 'react';
import { Transaction, ShiftType, PaymentStatus } from '../../types';
import { startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';

type PeriodFilter = 'thisMonth' | 'lastMonth' | 'thisWeek' | 'all' | 'custom';

interface UseReportsFiltersReturn {
  periodFilter: PeriodFilter;
  institutionFilter: string;
  activityFilter: string;
  showPrintView: boolean;
  setPeriodFilter: (v: PeriodFilter) => void;
  setInstitutionFilter: (v: string) => void;
  setActivityFilter: (v: string) => void;
  setShowPrintView: (v: boolean) => void;
  filteredActividades: Transaction[];
  institutions: string[];
  totalGuardias: number;
  totalProcedimientos: number;
  totalInterconsultas: number;
  totalExtras: number;
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  periodLabels: Record<PeriodFilter, string>;
}

export function useReportsFilters(transactions: Transaction[], language: string): UseReportsFiltersReturn {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('thisMonth');
  const [institutionFilter, setInstitutionFilter] = useState<string>('Todas');
  const [activityFilter, setActivityFilter] = useState<string>('Todos');
  const [showPrintView, setShowPrintView] = useState(false);

  const filteredActividades = useMemo(() => {
    let filtered = transactions;
    const now = new Date();

    if (periodFilter === 'thisMonth') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      filtered = filtered.filter(a => { const d = parseISO(a.date); return d >= start && d <= end; });
    } else if (periodFilter === 'lastMonth') {
      const start = startOfMonth(subMonths(now, 1));
      const end = endOfMonth(subMonths(now, 1));
      filtered = filtered.filter(a => { const d = parseISO(a.date); return d >= start && d <= end; });
    } else if (periodFilter === 'thisWeek') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      filtered = filtered.filter(a => { const d = parseISO(a.date); return d >= start && d <= end; });
    }

    if (institutionFilter !== 'Todas') {
      filtered = filtered.filter(a => a.institution === institutionFilter);
    }

    if (activityFilter !== 'Todos') {
      const shiftMap: Record<string, ShiftType> = {
        guardia: ShiftType.ACTIVE,
        procedimiento: ShiftType.CONSULTATION,
        interconsulta: ShiftType.PASSIVE,
        extra: ShiftType.EXTRA,
      };
      const targetType = shiftMap[activityFilter];
      if (targetType) filtered = filtered.filter(a => a.type === targetType);
    }

    return filtered;
  }, [transactions, periodFilter, institutionFilter, activityFilter]);

  const institutions = ['Todas', ...new Set(transactions.map(a => a.institution))];

  const totalGuardias = filteredActividades.filter(a => a.type === ShiftType.ACTIVE).reduce((s, a) => s + a.amount, 0);
  const totalProcedimientos = filteredActividades.filter(a => a.type === ShiftType.CONSULTATION).reduce((s, a) => s + a.amount, 0);
  const totalInterconsultas = filteredActividades.filter(a => a.type === ShiftType.PASSIVE).reduce((s, a) => s + a.amount, 0);
  const totalExtras = filteredActividades.filter(a => a.type === ShiftType.EXTRA).reduce((s, a) => s + a.amount, 0);
  const totalInvoiced = totalGuardias + totalProcedimientos + totalInterconsultas + totalExtras;
  const totalPaid = filteredActividades.filter(a => a.status === PaymentStatus.PAID).reduce((s, a) => s + a.amount, 0);
  const totalPending = filteredActividades.filter(a => a.status === PaymentStatus.PENDING).reduce((s, a) => s + a.amount, 0);

  const periodLabels = {
    thisMonth: language === 'es' ? 'Este Mes' : 'This Month',
    lastMonth: language === 'es' ? 'Mes Anterior' : 'Last Month',
    thisWeek: language === 'es' ? 'Esta Semana' : 'This Week',
    all: language === 'es' ? 'Todos' : 'All',
    custom: language === 'es' ? 'Personalizado' : 'Custom',
  };

  return {
    periodFilter, institutionFilter, activityFilter, showPrintView,
    setPeriodFilter, setInstitutionFilter, setActivityFilter, setShowPrintView,
    filteredActividades, institutions,
    totalGuardias, totalProcedimientos, totalInterconsultas, totalExtras,
    totalInvoiced, totalPaid, totalPending, periodLabels,
  };
}
