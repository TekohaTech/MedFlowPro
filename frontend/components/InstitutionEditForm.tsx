import { useState } from 'react';
import { Institution } from '../types';
import { api } from '../services/api';
import { Button } from './ui/Button';

interface InstitutionEditFormProps {
  institution?: Institution;
  onSave: (inst: Institution, name: string) => void;
  onCancel: () => void;
}

function initForm(inst?: Institution) {
  return {
    name: inst?.name ?? '',
    guardiaRate: inst?.guardia_rate?.toString() ?? '',
    guardiaSemanaRate: inst?.guardia_semana_rate?.toString() ?? '',
    guardiaFindeRate: inst?.guardia_finde_rate?.toString() ?? '',
    procedimientoRate: inst?.procedimiento_rate?.toString() ?? '',
    interconsultaRate: inst?.interconsulta_rate?.toString() ?? '',
  };
}

type FormFields = ReturnType<typeof initForm>;
type FormKey = keyof FormFields;

export function InstitutionEditForm({ institution, onSave, onCancel }: InstitutionEditFormProps) {
  const [form, setForm] = useState(initForm(institution));
  const [saving, setSaving] = useState(false);

  const setField = (key: FormKey) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        guardia_rate: form.guardiaRate ? parseInt(form.guardiaRate.replace(/\D/g, '')) : null,
        guardia_semana_rate: form.guardiaSemanaRate ? parseInt(form.guardiaSemanaRate.replace(/\D/g, '')) : null,
        guardia_finde_rate: form.guardiaFindeRate ? parseInt(form.guardiaFindeRate.replace(/\D/g, '')) : null,
        procedimiento_rate: form.procedimientoRate ? parseInt(form.procedimientoRate.replace(/\D/g, '')) : null,
        interconsulta_rate: form.interconsultaRate ? parseInt(form.interconsultaRate.replace(/\D/g, '')) : null,
      };
      const updated = institution
        ? await api.updateInstitution(institution.id, payload)
        : await api.createInstitution(payload);
      onSave(updated, institution ? '' : updated.name);
    } catch (e) {
      console.error('Error saving institution', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
      <input type="text" value={form.name} onChange={setField('name')}
        placeholder="Nombre de la institución"
        title="Nombre del hospital, clínica o sanatorio"
        className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[9px] font-black text-slate-700 block mb-1">🇪 Guardia ($/h)</label>
          <input type="text" inputMode="numeric" value={form.guardiaSemanaRate} onChange={setField('guardiaSemanaRate')}
            placeholder="Semana" title="Valor por hora de guardia en día de semana (lunes a viernes)"
            className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2 font-bold text-sm text-slate-900 dark:text-white" />
          <input type="text" inputMode="numeric" value={form.guardiaFindeRate} onChange={setField('guardiaFindeRate')}
            placeholder="Finde" title="Valor por hora de guardia en fin de semana (sábado o domingo)"
            className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2 font-bold text-sm text-slate-900 dark:text-white mt-1" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-700 block mb-1">Otros</label>
          <input type="text" inputMode="numeric" value={form.procedimientoRate} onChange={setField('procedimientoRate')}
            placeholder="Proced. unit." title="Valor por procedimiento (ej: RMN, ecografía, cirugía menor)"
            className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2 font-bold text-sm text-slate-900 dark:text-white" />
          <input type="text" inputMode="numeric" value={form.interconsultaRate} onChange={setField('interconsultaRate')}
            placeholder="Interc. c/u" title="Valor por interconsulta (ej: evaluación de otra especialidad)"
            className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2 font-bold text-sm text-slate-900 dark:text-white mt-1" />
          <input type="text" inputMode="numeric" value={form.guardiaRate} onChange={setField('guardiaRate')}
            placeholder="Guardia (legacy)" title="Valor anterior de guardia. Si ya completás Semana y Finde arriba, no hace falta llenarlo."
            className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2 font-bold text-sm text-slate-400 dark:text-slate-500 mt-1" />
        </div>
      </div>
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
