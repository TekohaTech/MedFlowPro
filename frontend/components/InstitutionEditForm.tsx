import { useState } from 'react';
import { Institution } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { parseAmount, formatMoneyInput } from '../lib/utils';

interface InstitutionEditFormProps {
  institution?: Institution;
  activityMode?: 'guardia' | 'extra';
  onSave: (inst: Institution, name: string) => void;
  onCancel: () => void;
}

function initForm(inst?: Institution) {
  const fmt = (v?: number | null) => (v != null ? v.toLocaleString('es-AR') : '');
  return {
    name: inst?.name ?? '',
    guardiaRate: fmt(inst?.guardia_rate),
    guardiaSemanaRate: fmt(inst?.guardia_semana_rate),
    guardiaFindeRate: fmt(inst?.guardia_finde_rate),
    guardiaFeriadoRate: fmt(inst?.guardia_feriado_rate),
    procedimientoRate: fmt(inst?.procedimiento_rate),
    interconsultaRate: fmt(inst?.interconsulta_rate),
  };
}

type FormFields = ReturnType<typeof initForm>;
type FormKey = keyof FormFields;

export function InstitutionEditForm({ institution, activityMode, onSave, onCancel }: InstitutionEditFormProps) {
  const [form, setForm] = useState(initForm(institution));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setField = (key: FormKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    // Rate fields: format es-AR as you type (thousands dot, decimal comma); letters never appear.
    const value = key === 'name' ? e.target.value : formatMoneyInput(e.target.value);
    setForm(prev => ({ ...prev, [key]: value }));
  };

  /** es-AR parse: '1.250,50' → 1250.5; empty string → null (unset). */
  const parseRateField = (raw: string): number | null => {
    if (!raw.trim()) return null;
    return parseAmount(raw);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name: form.name.trim(),
        guardia_rate: parseRateField(form.guardiaRate),
        guardia_semana_rate: parseRateField(form.guardiaSemanaRate),
        guardia_finde_rate: parseRateField(form.guardiaFindeRate),
        guardia_feriado_rate: parseRateField(form.guardiaFeriadoRate),
        procedimiento_rate: parseRateField(form.procedimientoRate),
        interconsulta_rate: parseRateField(form.interconsultaRate),
      };
      const updated = institution
        ? await api.updateInstitution(institution.id, payload)
        : await api.createInstitution(payload);
      onSave(updated, institution ? '' : updated.name);
    } catch (e) {
      console.error('Error saving institution', e);
      setSaveError('No se pudo guardar. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const isExtraMode = activityMode === 'extra' && !institution;

  return (
    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
      <input type="text" value={form.name} onChange={setField('name')}
        placeholder={isExtraMode ? 'Nombre del pagador' : 'Nombre de la institución'}
        title={isExtraMode ? 'Nombre del lugar que paga este extra' : 'Nombre del hospital, clínica o sanatorio'}
        className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />

      {isExtraMode ? (
        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
          Solo necesitás el nombre. Las tarifas no aplican para actividades extra.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl">
            <label className="text-[9px] font-black text-blue-700 dark:text-blue-400 block mb-2 uppercase tracking-widest">
              Guardia ($/hora)
            </label>
            <input type="text" inputMode="numeric" value={form.guardiaSemanaRate} onChange={setField('guardiaSemanaRate')}
              placeholder="Semana (lun–vie)" title="Valor por hora de guardia en día de semana (lunes a viernes)"
              className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />
            <input type="text" inputMode="numeric" value={form.guardiaFindeRate} onChange={setField('guardiaFindeRate')}
              placeholder="Fin de semana (sáb–dom)" title="Valor por hora de guardia en fin de semana (sábado o domingo)"
              className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white mt-1.5" />
            <input type="text" inputMode="numeric" value={form.guardiaFeriadoRate} onChange={setField('guardiaFeriadoRate')}
              placeholder="Feriado (opcional)" title="Valor por hora de guardia en feriado nacional"
              className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white mt-1.5" />
            <label htmlFor="guardia-rate-unica" className="text-[9px] font-black text-blue-700 dark:text-blue-400 block mt-2 mb-1 uppercase tracking-widest">
              Tarifa única (opcional)
            </label>
            <input id="guardia-rate-unica" type="text" inputMode="numeric" value={form.guardiaRate} onChange={setField('guardiaRate')}
              placeholder="" title="Si usás una tarifa única sin diferenciar semana/finde. Si ya pusiste Semana y Finde, dejalo vacío."
              className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />
            <p className="text-[9px] text-slate-500 leading-tight mt-1">
              Usala solo si no querés diferenciar semana/finde. Dejalo vacío si ya cargaste Semana y Finde.
            </p>
          </div>
          <div className="bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl">
            <label className="text-[9px] font-black text-amber-700 dark:text-amber-400 block mb-2 uppercase tracking-widest">
              Procedimiento / Interconsulta
            </label>
            <input type="text" inputMode="numeric" value={form.procedimientoRate} onChange={setField('procedimientoRate')}
              placeholder="$ por procedimiento" title="Valor por procedimiento (ej: RMN, ecografía, cirugía menor)"
              className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />
            <input type="text" inputMode="numeric" value={form.interconsultaRate} onChange={setField('interconsultaRate')}
              placeholder="$ por interconsulta" title="Valor por interconsulta (ej: evaluación de otra especialidad)"
              className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white mt-1.5" />
          </div>
        </div>
      )}

      {saveError && (
        <p className="text-[10px] text-red-600 dark:text-red-400 font-bold">{saveError}</p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={!form.name.trim() || saving}>
          {saving ? 'Guardando...' : institution ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </div>
  );
}
