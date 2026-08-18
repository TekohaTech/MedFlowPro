import { useState, useEffect } from 'react';
import type { MonthlyRow } from '../types';
import { api } from '../services/api';

export function useMonthlyComparison(year: number) {
  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getMonthlyComparison(year)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [year]);

  return { rows, loading };
}
