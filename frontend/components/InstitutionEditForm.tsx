import { Institution } from '../types';
import { Button } from './ui/Button';
import { InstitutionColorPicker } from './InstitutionColorPicker';
import { useInstitutionForm } from './useInstitutionForm';
import { translations, type Language } from '../translations';

interface InstitutionEditFormProps {
  institution?: Institution;
  /** Full institution list (used to mark colors already taken by other institutions). */
  institutions?: Institution[];
  activityMode?: 'guardia' | 'extra';
  language?: Language;
  onSave: (inst: Institution, name: string) => void;
  onCancel: () => void;
}

export function InstitutionEditForm({
  institution, institutions, activityMode, language = 'es', onSave, onCancel,
}: InstitutionEditFormProps) {
  const t = translations[language];
  const isExtraMode = activityMode === 'extra' && !institution;

  // All state + API calls live in the hook; this component only renders.
  const { form, setField, selectColor, occupiedColors, formAction, isPending, formState } =
    useInstitutionForm(institution, institutions, language, onSave);

  return (
    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
      <div className="space-y-3">
        <input type="text" name="name" value={form.name} onChange={setField('name')}
          placeholder={isExtraMode ? t.nombrePagador : t.nombreInstitucion}
          title={isExtraMode ? t.nombrePagadorTitle : t.nombreInstitucionTitle}
          className="w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />
        <input type="hidden" name="color" value={form.color} />

        <InstitutionColorPicker
          value={form.color}
          occupiedColors={occupiedColors}
          error={form.colorError || undefined}
          required={!institution}
          language={language}
          onSelect={selectColor}
        />

        {isExtraMode ? (
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
            {t.extraSinTarifas}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl">
              <label className="text-[9px] font-black text-blue-700 dark:text-blue-400 block mb-2 uppercase tracking-widest">
                {t.guardiaPorHora}
              </label>
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">{t.semanaLunVie}</label>
              <input type="text" inputMode="numeric" value={form.guardiaSemanaRate} onChange={setField('guardiaSemanaRate')}
                title={t.semanaLunVieTitle}
                className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5 mt-1.5">{t.findeSabDom}</label>
              <input type="text" inputMode="numeric" value={form.guardiaFindeRate} onChange={setField('guardiaFindeRate')}
                title={t.findeSabDomTitle}
                className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5 mt-1.5">{t.feriadoOpcional}</label>
              <input type="text" inputMode="numeric" value={form.guardiaFeriadoRate} onChange={setField('guardiaFeriadoRate')}
                title={t.feriadoOpcionalTitle}
                className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />
              <label htmlFor="guardia-rate-unica" className="text-[9px] font-black text-blue-700 dark:text-blue-400 block mt-2 mb-1 uppercase tracking-widest">
                {t.tarifaUnica}
              </label>
              <input id="guardia-rate-unica" type="text" inputMode="numeric" value={form.guardiaRate} onChange={setField('guardiaRate')}
                placeholder="" title={t.tarifaUnicaTitle}
                className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />
              <p className="text-[9px] text-slate-500 leading-tight mt-1">
                {t.tarifaUnicaHint}
              </p>
            </div>
            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl">
              <label className="text-[9px] font-black text-amber-700 dark:text-amber-400 block mb-2 uppercase tracking-widest">
                {t.procedimientoInterconsulta}
              </label>
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">{t.porProcedimiento}</label>
              <input type="text" inputMode="numeric" value={form.procedimientoRate} onChange={setField('procedimientoRate')}
                title={t.porProcedimientoTitle}
                className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />
              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5 mt-1.5">{t.porInterconsulta}</label>
              <input type="text" inputMode="numeric" value={form.interconsultaRate} onChange={setField('interconsultaRate')}
                title={t.porInterconsultaTitle}
                className="w-full bg-white dark:bg-slate-700 border border-slate-200 rounded-xl p-2.5 font-bold text-sm text-slate-900 dark:text-white" />
            </div>
          </div>
        )}

        {formState.saveError && (
          <p className="text-[10px] text-red-600 dark:text-red-400 font-bold">{formState.saveError}</p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            {t.cancelar}
          </Button>
          <Button type="button" size="sm" disabled={!form.name.trim() || isPending}
            onClick={() => {
              const fd = new FormData();
              fd.append('name', form.name);
              fd.append('color', form.color);
              formAction(fd);
            }}>
            {isPending ? t.guardando : institution ? t.actualizar : t.crear}
          </Button>
        </div>
      </div>
    </div>
  );
}
