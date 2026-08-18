import { useState, useEffect } from 'react';
import type { ActividadStats } from '../types';
import { api } from '../services/api';

export function useStats() {
  const [stats, setStats] = useState<ActividadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, error, fetchStats };
}
