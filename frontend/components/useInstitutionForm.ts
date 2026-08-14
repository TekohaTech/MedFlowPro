import { useMemo, useState, useActionState, type ChangeEvent } from 'react';
import { Institution } from '../types';
import { api } from '../services/api';
import { getInstitutionColorMap } from '../lib/institutionColors';
import { parseAmount, formatMoneyInput } from '../lib/utils';
import { translations, type Language } from '../translations';

interface InstitutionFormState {
  saveError?: string;
}

function initForm(inst?: Institution) {
  const fmt = (v?: number | null) => (v != null ? v.toLocaleString('es-AR') : '');
  return {
    name: inst?.name ?? '',
    color: inst?.color ?? '',
    colorError: '',
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

// Only rate fields are es-AR money inputs; name/color/colorError are plain text.
const RATE_KEYS = new Set<FormKey>([
  'guardiaRate', 'guardiaSemanaRate', 'guardiaFindeRate',
  'guardiaFeriadoRate', 'procedimientoRate', 'interconsultaRate',
]);

/**
 * Create/update form logic for an institution, driven by a React 19 form
 * action (same pattern as useShiftForm). The action performs the API calls so
 * the component stays presentation-only; color-required-on-create is validated
 * inside the action and surfaced through form.colorError.
 */
export function useInstitutionForm(
  institution: Institution | undefined,
  institutions: Institution[] | undefined,
  language: Language,
  onSave: (inst: Institution, name: string) => void,
) {
  const t = translations[language];
  const [form, setForm] = useState(initForm(institution));

  const setField = (key: FormKey) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = RATE_KEYS.has(key) ? formatMoneyInput(e.target.value) : e.target.value;
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Colors already used by OTHER institutions, exactly as they resolve in the
  // real render map. The map is computed over the FULL list (same order the
  // calendar/picker use), so a legacy institution's auto-assigned color is
  // never offered as "free" when picking it would shift that other
  // institution's dot. Only the edited institution's OWN resolved color is
  // subtracted — re-selecting it must stay allowed and shifts nothing.
  const occupiedColors = useMemo(() => {
    const map = getInstitutionColorMap(institutions ?? []);
    const ownColor = institution ? (map.get(institution.name) ?? '') : '';
    return Array.from(map.values()).filter(c => c !== ownColor);
  }, [institutions, institution]);

  const selectColor = (color: string) => {
    setForm(prev => ({ ...prev, color, colorError: '' }));
  };

  /** es-AR parse: '1.250,50' → 1250.5; empty string → null (unset). */
  const parseRateField = (raw: string): number | null => {
    if (!raw.trim()) return null;
    return parseAmount(raw);
  };

  const [formState, formAction, isPending] = useActionState(
    async (prev: InstitutionFormState, formData: FormData): Promise<InstitutionFormState> => {
      const name = (formData.get('name') as string) ?? form.name;
      const color = (formData.get('color') as string) ?? form.color;
      if (!name.trim()) return prev;
      // Creating requires a color so the calendar can show the institution.
      if (!institution && !color) {
        setForm(p => ({ ...p, colorError: t.elegirUnColor }));
        return prev;
      }
      try {
        const payload = {
          name: name.trim(),
          color: color || null,
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
        return {};
      } catch (e) {
        console.error('Error saving institution', e);
        return { saveError: t.errorAlGuardarInstitucion };
      }
    },
    {},
  );

  return { form, setField, selectColor, occupiedColors, formState, formAction, isPending };
}

/** Soft-delete: marks the institution inactive. Activities keep their data. */
export function useInstitutionDeactivate() {
  const deactivate = async (id: string): Promise<boolean> => {
    try {
      await api.updateInstitution(id, { is_active: false });
      return true;
    } catch (e) {
      console.error('Error deleting institution', e);
      return false;
    }
  };
  return { deactivate };
}
