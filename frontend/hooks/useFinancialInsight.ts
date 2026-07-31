import { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { GeminiService } from '../services/gemini';

const FALLBACK_INSIGHT = "Optimiza tus turnos para aumentar un 15% tus ingresos el próximo mes.";

export function useFinancialInsight(transactions: Transaction[]): string {
  const [insight, setInsight] = useState<string>("Analizando tus finanzas...");
  const gemini = GeminiService.getInstance();

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const text = await gemini.getFinancialInsight(transactions);
        setInsight(text);
      } catch (e) {
        setInsight(FALLBACK_INSIGHT);
      }
    };
    fetchInsight();
  }, [transactions]);

  return insight;
}
