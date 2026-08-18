import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Institution } from '../types';
import { parseAmount } from '../lib/utils';
import { api } from '../services/api';
import { translations, type Language } from '../translations';

export type RateType = 'guardia_semana_rate' | 'guardia_finde_rate' | 'guardia_feriado_rate' | 'procedimiento_rate' | 'interconsulta_rate';

/**
 * Parses the inline edit input with es-AR rules: '1250,50' → 1250.5,
 * '8.000' → 8000, '12000' → 12000. '' → null (unset), junk/letters → null.
 */
export function parseRateInput(value: string): number | null {
  const cleaned = value.replace(/[^\d.,]/g, '');
  if (!/\d/.test(cleaned)) return null;
  return parseAmount(cleaned);
}

/**
 * True when the edit is a no-op: the input parses to the same value as the
 * current rate, including both empty/unset (undefined counts as unset).
 */
export function shouldSkipRateSave(numValue: number | null, prevValue: number | null | undefined): boolean {
  return numValue === (prevValue ?? null);
}

interface UseRateEditorOptions {
  institution: Institution;
  onInstitutionChange: (inst: Institution) => void;
  language: Language;
}

export function useRateEditor({ institution, onInstitutionChange, language }: UseRateEditorOptions) {
  const t = translations[language];

  const [editingRateType, setEditingRateType] = useState<RateType | null>(null);
  const [tempRateValue, setTempRateValue] = useState('');
  const [rateFeedback, setRateFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [pendingDialog, setPendingDialog] = useState<{ fromDate: string; loading: boolean; result: string | null } | null>(null);

  useEffect(() => {
    if (rateFeedback?.kind === 'success') {
      const timer = setTimeout(() => setRateFeedback(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [rateFeedback]);

  const handleSaveRateEdit = useCallback(async (type: RateType, value: string) => {
    const numValue = parseRateInput(value);
    const prevValue = institution[type];

    if (shouldSkipRateSave(numValue, prevValue)) {
      setRateFeedback(null);
      setEditingRateType(null);
      return;
    }

    try {
      const updateData: Partial<Institution> = {};
      updateData[type] = numValue;
      const updated = await api.updateInstitution(institution.id, updateData);
      onInstitutionChange(updated);
      const labels: Record<string, string> = {
        guardia_semana_rate: `Guardia ${t.semana}`,
        guardia_finde_rate: `Guardia ${t.finde}`,
        guardia_feriado_rate: `Guardia ${t.feriado}`,
        procedimiento_rate: t.tipoProced,
        interconsulta_rate: t.inter,
      };
      setRateFeedback({ kind: 'success', text: `${labels[type]} ${t.tarifaActualizada} ${String.fromCharCode(0x2713)}` });

      if (numValue !== prevValue && (type === 'guardia_semana_rate' || type === 'guardia_finde_rate' || type === 'guardia_feriado_rate')) {
        setPendingDialog({
          fromDate: format(new Date(), 'yyyy-MM-dd'),
          loading: false,
          result: null,
        });
      }
    } catch (e) {
      console.error('Error saving rate', e);
      setRateFeedback({ kind: 'error', text: t.noGuardarTarifa });
    }
    setEditingRateType(null);
  }, [institution, onInstitutionChange, t]);

  const handleApplyToPending = useCallback(async () => {
    if (!pendingDialog) return;
    setPendingDialog({ ...pendingDialog, loading: true, result: null });
    try {
      const res = await api.recalculatePending(institution.id, pendingDialog.fromDate);
      setPendingDialog({
        ...pendingDialog,
        loading: false,
        result: `✅ ${res.updated_count} ${t.guardiasActualizadas}`,
      });
    } catch {
      setPendingDialog({ ...pendingDialog, loading: false, result: `❌ ${t.errorRecalcular}` });
    }
  }, [pendingDialog, institution.id, t]);

  const handleRateClick = useCallback((type: RateType, value: number | null | undefined) => {
    setRateFeedback(null);
    setEditingRateType(type);
    setTempRateValue(value != null ? value.toLocaleString('es-AR') : '');
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingRateType(null);
  }, []);

  return {
    editingRateType,
    setEditingRateType,
    tempRateValue,
    setTempRateValue,
    rateFeedback,
    setRateFeedback,
    showTooltip,
    setShowTooltip,
    pendingDialog,
    setPendingDialog,
    handleSaveRateEdit,
    handleApplyToPending,
    handleRateClick,
    handleCancelEdit,
  };
}
