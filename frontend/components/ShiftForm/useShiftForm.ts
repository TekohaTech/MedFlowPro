import { useState, useEffect, useRef, useActionState } from 'react';
import { format, addDays } from 'date-fns';
import { ShiftType, Transaction, PaymentStatus, type Institution } from '../../types';
import { esFeriado } from '../../lib/feriados';
import { computeGuardiaBreakdown } from '../../lib/guardiaBreakdown';
import { parseAmount } from '../../lib/utils';
import { translations, type Language } from '../../translations';

type ActivityMode = 'guardia' | 'extra';

/** Breakdown segment used by RateInfo to render the mixed day-type line. */
export interface RateBreakdownSegment {
  hours: number;
  rate: number;
  /** i18n key in translations.ts (diaSemana / diaFinde / diaFeriado). */
  labelKey: 'diaSemana' | 'diaFinde' | 'diaFeriado';
}

export interface ExtraActivity {
  id: string;
  type: 'procedimiento' | 'interconsulta';
  procedureName?: string;
  specialty?: string;
  amount: number;
  notes?: string;
  status: PaymentStatus;
  // Fecha/hora en que se realizó. Vacío = usa la fecha de la guardia.
  date: string;
  startTime?: string;
  isNew: boolean;
}

interface ShiftFormState {
  error?: string;
}

// Loaded same-day extras keep their REAL id and must UPDATE on submit.
export function toExtraActivity(t: Transaction): ExtraActivity {
  return {
    id: t.id,
    type: t.type === ShiftType.CONSULTATION ? 'procedimiento' as const : 'interconsulta' as const,
    procedureName: t.notes?.startsWith('procedimiento') ? t.notes : undefined,
    specialty: t.notes?.startsWith('interconsulta') ? t.notes : undefined,
    amount: t.amount,
    notes: t.notes,
    status: t.status || PaymentStatus.PENDING,
    date: t.date,
    startTime: t.startTime || undefined,
    isNew: false,
  };
}

// Newly added extras carry an ephemeral id and must be CREATED on submit.
export function newExtraActivity(rate: number): ExtraActivity {
  return {
    id: Math.random().toString(36).slice(2),
    type: 'procedimiento',
    procedureName: '',
    amount: rate,
    notes: '',
    status: PaymentStatus.PENDING,
    // Vacío = usa la fecha de la guardia al guardar.
    date: '',
    isNew: true,
  };
}

// Submit-id contract: loaded extras (isNew: false) keep their id → PUT route,
// added extras (isNew: true) drop it → POST route.
export function getExtraId(extra: { id: string; isNew: boolean }): string | undefined {
  return extra.isNew ? undefined : extra.id;
}

// Rate rule for the $/Hora prefill: a national holiday uses the institution's
// feriado rate, a Saturday/Sunday uses the weekend rate, otherwise the manual
// fallback (weekday) rate wins.
export function resolveGuardiaRate(
  date: string,
  inst: Institution | undefined,
  manualRate: number,
): number {
  if (esFeriado(date) && inst?.guardia_feriado_rate != null) {
    return inst.guardia_feriado_rate;
  }
  if (inst?.guardia_finde_rate != null) {
    const day = new Date(date + 'T12:00:00').getDay();
    if (day === 0 || day === 6) {
      return inst.guardia_finde_rate;
    }
  }
  return manualRate;
}

export function useShiftForm(
  onSubmit: (tx: Partial<Transaction>) => void,
  editingTransaction: Transaction | undefined,
  transactions: Transaction[] | undefined,
  initialDate: string | undefined,
  institutions: Institution[],
  onClose: () => void,
  language: Language,
) {
  const t = translations[language];
  const initialMode: ActivityMode =
    editingTransaction?.type === ShiftType.EXTRA ||
    editingTransaction?.type === ShiftType.CONSULTATION ||
    editingTransaction?.type === ShiftType.PASSIVE
      ? 'extra'
      : 'guardia';
  const [activityMode, setActivityMode] = useState<ActivityMode>(initialMode);
  const [amount, setAmount] = useState<string>(editingTransaction ? editingTransaction.amount.toLocaleString('es-AR') : '');
  const [date, setDate] = useState<string>(editingTransaction ? editingTransaction.date : (initialDate || format(new Date(), 'yyyy-MM-dd')));
  const [institution, setInstitution] = useState(editingTransaction ? editingTransaction.institution : '');
  const [status, setStatus] = useState<PaymentStatus>(editingTransaction ? editingTransaction.status : PaymentStatus.PENDING);
  // Notes: si es sub-item con nombre separado, remover el prefijo del nombre
  const initialSubName = editingTransaction?.procedureName || editingTransaction?.specialty || '';
  const initialNotes = (editingTransaction?.notes && initialSubName)
    ? editingTransaction.notes.replace(new RegExp(`^${initialSubName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:?\\s*`), '')
    : (editingTransaction?.notes || '');
  const [notes, setNotes] = useState(initialNotes);
  const [startTime, setStartTime] = useState(editingTransaction?.startTime || '08:00');
  const [endTime, setEndTime] = useState(editingTransaction?.endTime || '08:00');
  const [endDate, setEndDate] = useState(editingTransaction?.endDate || format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [hours, setHours] = useState<string>(editingTransaction?.duration ? editingTransaction.duration.toString() : '12');
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [extras, setExtras] = useState<ExtraActivity[]>([]);
  const [shiftSubtype, setShiftSubtype] = useState<'activa' | 'pasiva'>('activa');
  const [conceptName, setConceptName] = useState(editingTransaction?.conceptName || '');

  // Para procedimiento/interconsulta: nombre separado de notas
  const isSubItemEdit = editingTransaction?.type === ShiftType.CONSULTATION || editingTransaction?.type === ShiftType.PASSIVE;
  const subItemType = isSubItemEdit
    ? (editingTransaction!.type === ShiftType.CONSULTATION ? 'procedimiento' as const : 'interconsulta' as const)
    : undefined;
  const [subItemName, setSubItemName] = useState(
    isSubItemEdit
      ? (editingTransaction!.procedureName || editingTransaction!.specialty || '')
      : ''
  );

  // Declared BEFORE the effects below: the holiday-rate effect depends on it,
  // and a const referenced in a useEffect deps array must already be initialized.
  const selectedInstitution = institutions.find(i =>
    i.name.toLowerCase().trim() === institution.toLowerCase().trim() && i.is_active
  );

  // Always-fresh snapshot of transactions for the load-extras effect below.
  // Kept in a ref (not a dependency) so the load-extras effect only re-runs
  // when editingTransaction changes; depending on array identity would loop
  // setExtras([]) whenever the parent passes a new `[]`.
  const transactionsRef = useRef(transactions);
  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    // Solo cargar sub-actividades cuando EDITAMOS una GUARDIA (ACTIVE)
    if (editingTransaction && editingTransaction.type === ShiftType.ACTIVE && transactionsRef.current) {
      const sameDayExtras = transactionsRef.current.filter(t =>
        t.date === editingTransaction.date &&
        t.institution === editingTransaction.institution &&
        t.id !== editingTransaction.id &&
        (t.type === ShiftType.CONSULTATION || t.type === ShiftType.PASSIVE)
      );
      setExtras(sameDayExtras.map(toExtraActivity));
    } else {
      setExtras([]);
    }
  }, [editingTransaction]);

  useEffect(() => {
    if (activityMode === 'guardia' && date && parseInt(hours) > 0 && startTime) {
      const start = new Date(date + 'T' + startTime);
      const end = new Date(start.getTime() + parseInt(hours) * 60 * 60 * 1000);
      // Local date, NOT UTC: toISOString() would shift a 21:00-23:59 local
      // end onto the NEXT calendar day (e.g. 22:00 -03:00 = 01:00Z +1d).
      setEndDate(format(end, 'yyyy-MM-dd'));
      setEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
    }
  }, [activityMode, date, hours, startTime]);

  // Range error shown in the form: a backwards range (end <= start) is
  // rejected. There is no maximum duration — a doctor can legitimately work
  // 72h+ guardias and the amount is classified hour-by-hour regardless of
  // length. The preview must never silently fall back to a stale amount.
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Amount preview: hours classified by medical day (08:00 → 08:00), matching
  // the backend rule. Feriado rate wins on holidays; without it, holiday hours
  // fall back to weekday/weekend. The manual $/Hora is the fallback when the
  // institution has no rates configured.
  useEffect(() => {
    if (activityMode !== 'guardia') return;
    const rawRate = parseAmount(hourlyRate);
    const hoursNum = parseInt(hours);
    if (!(hoursNum > 0) || !(rawRate > 0 || selectedInstitution)) return;
    if (!date || !startTime || !endDate || !endTime) {
      setPreviewError(null);
      return;
    }
    const start = new Date(date + 'T' + startTime);
    const end = new Date(endDate + 'T' + endTime);
    if (end <= start) {
      setPreviewError(t.errorRangoInvertido);
      setAmount('');
      return;
    }
    setPreviewError(null);

    const { split, semanaRate, findeRate, feriadoRate } = computeGuardiaBreakdown(
      start, end, selectedInstitution ?? null, rawRate,
    );
    const et = extras.reduce((s, e) => s + e.amount, 0);
    const total =
      split.weekdayHours * (semanaRate ?? 0) +
      split.weekendHours * (findeRate ?? 0) +
      split.feriadoHours * (feriadoRate ?? 0) +
      et;
    if (total > 0) setAmount(total.toLocaleString('es-AR'));
  }, [activityMode, hours, hourlyRate, date, startTime, endDate, endTime, selectedInstitution, extras]);

  useEffect(() => {
    if (initialDate && !editingTransaction) setDate(initialDate);
  }, [initialDate, editingTransaction]);

  // Last auto-filled $/Hora value. The date-change effect only re-prefills
  // when the field still holds this value — a hand-edited rate differs and is
  // never overwritten.
  const lastAutoRate = useRef<string | null>(null);

  const prefillRate = (rate: number) => {
    // es-AR format exactly like RateEditor ('1.250,5'): a raw '1250.5' would
    // be misread as thousands-dot by formatMoneyInput on the next keystroke
    // ('1250.5' + '0' → '125.050' → 125050 pesos).
    const formatted = rate.toLocaleString('es-AR');
    lastAutoRate.current = formatted;
    setHourlyRate(formatted);
  };

  const handleSelectInstitution = (name: string, institution?: Institution) => {
    setInstitution(name);
    // Si viene la institución completa (recién creada), usarla directo para cargar el rate
    const inst = institution ?? institutions.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (inst) {
      const rate = resolveGuardiaRate(date, inst, inst.guardia_semana_rate ?? inst.guardia_rate ?? 0);
      if (rate !== null && rate !== undefined) prefillRate(rate);
    }
  };

  // Re-prefill the rate when the date moves to/from a weekend/holiday, but only
  // while the field still holds the auto-filled value.
  useEffect(() => {
    if (!selectedInstitution || !date) return;
    if (hourlyRate !== lastAutoRate.current) return;
    const rate = resolveGuardiaRate(date, selectedInstitution, selectedInstitution.guardia_semana_rate ?? selectedInstitution.guardia_rate ?? 0);
    if (rate !== null && rate !== undefined) prefillRate(rate);
  }, [date, selectedInstitution, hourlyRate]);

  const addExtra = () => {
    setExtras([...extras, newExtraActivity(selectedInstitution?.procedimiento_rate || 0)]);
  };

  const updateExtra = (id: string, updates: Partial<ExtraActivity>) => {
    setExtras(extras.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const removeExtra = (id: string) => {
    setExtras(extras.filter(e => e.id !== id));
  };

  const extraTotal = extras.reduce((s, e) => s + e.amount, 0);

  const [formState, formAction, isPending] = useActionState(
    async (prev: ShiftFormState, formData: FormData) => {
      const rawAmount = formData.get('amount_display') as string || amount;
      // Preserve 2 decimals from es-AR formatted input: '$1.250,50' → 1250.5
      const cleanAmount = parseAmount(rawAmount);
      if (cleanAmount <= 0) return { error: t.errorCamposObligatorios };
      if (activityMode !== 'extra' && !institution) return { error: t.errorCamposObligatorios };

      try {
        if (activityMode === 'extra') {
          const fDate = (formData.get('date') as string) || date;
          const fStatus = (formData.get('status') as string) === 'paid' ? PaymentStatus.PAID : PaymentStatus.PENDING;
          const fNotes = (formData.get('notes') as string) || notes;

          // Determinar tipo: si editamos, preservar el original; si es nuevo, EXTRA
          const saveType = editingTransaction?.type ?? ShiftType.EXTRA;

          if (saveType === ShiftType.EXTRA) {
            const fConceptName = formData.get('concept_name') as string || conceptName;
            if (!fConceptName || !fConceptName.trim()) {
              return { error: t.errorConceptoObligatorio };
            }
            // Si no hay institución, usar el concepto como institución
            const effectiveInstitution = institution || fConceptName.trim();
            await onSubmit({
              amount: cleanAmount, date: fDate, institution: effectiveInstitution,
              type: saveType, status: fStatus, notes: fNotes,
              id: editingTransaction?.id, conceptName: fConceptName,
            });
          } else {
            // CONSULTATION o PASSIVE (procedimiento / interconsulta)
            const fSubName = formData.get('sub_item_name') as string || subItemName;
            // Reconstruir notes: "nombre: notas extra"
            const reconstructedNotes = [fSubName, fNotes].filter(Boolean).join(': ');
            await onSubmit({
              amount: cleanAmount, date: fDate, institution,
              type: saveType, status: fStatus, notes: reconstructedNotes,
              id: editingTransaction?.id,
              procedureName: saveType === ShiftType.CONSULTATION ? fSubName : undefined,
              specialty: saveType === ShiftType.PASSIVE ? fSubName : undefined,
            });
          }
          onClose();
          return {};
        }

        const rawRate = parseAmount(formData.get('hourly_rate') as string || hourlyRate);
        const fDate = formData.get('date') as string || date;
        const fEndDate = formData.get('end_date') as string || endDate;
        const fStartTime = formData.get('start_time') as string || startTime;
        const fEndTime = formData.get('end_time') as string || endTime;
        const fStatus = (formData.get('status') as string) === 'paid' ? PaymentStatus.PAID : PaymentStatus.PENDING;
        const fNotes = formData.get('notes') as string || notes;

        // Source of truth for the amount is the RANGE (the backend computes by
        // date+start_time → end_date+end_time). `duration` is derived from it
        // when the range is complete so it can never disagree with the stored
        // range; the `hours` input only drives the auto-computed end and is
        // the fallback for range-less legacy records.
        const fDuration = (fDate && fStartTime && fEndDate && fEndTime)
          ? Math.max(0, Math.round(
              (new Date(fEndDate + 'T' + fEndTime).getTime() - new Date(fDate + 'T' + fStartTime).getTime())
              / (60 * 60 * 1000),
            ))
          : (parseInt(hours) || 0);

        await onSubmit({
          amount: cleanAmount, date: fDate, endDate: fEndDate,
          startTime: fStartTime, endTime: fEndTime, institution,
          type: ShiftType.ACTIVE, status: fStatus, notes: fNotes,
          id: editingTransaction?.id, duration: fDuration, hourlyRate: rawRate, shiftSubtype,
        });

        for (const extra of extras) {
          if (extra.amount > 0) {
            await onSubmit({
              amount: extra.amount, date: extra.date || fDate,
              startTime: extra.startTime || undefined,
              institution,
              type: extra.type === 'procedimiento' ? ShiftType.CONSULTATION : ShiftType.PASSIVE,
              status: extra.status,
              notes: [extra.type === 'procedimiento' ? extra.procedureName : extra.specialty, extra.notes].filter(Boolean).join(': '),
              procedureName: extra.type === 'procedimiento' ? extra.procedureName : undefined,
              specialty: extra.type === 'interconsulta' ? extra.specialty : undefined,
              id: getExtraId(extra),
            });
          }
        }
        onClose();
        return {};
      } catch (e) {
        return { error: e instanceof Error ? e.message : t.errorGuardarDatos };
      }
    },
    { error: undefined },
  );

  const handleStatusToggle = () => {
    setStatus(status === PaymentStatus.PENDING ? PaymentStatus.PAID : PaymentStatus.PENDING);
  };

  const handleModeChange = (mode: ActivityMode) => {
    setActivityMode(mode);
  };

  // Flat-rate notice: selectedInstitution exists AND none of the four rate
  // fields (guardia_rate legacy included) is configured. Without rates the
  // backend respects the client-sent manual $/hora for ALL hours; the notice
  // tells the user that. No institution selected → nothing to warn about.
  const institutionHasNoRates = !!selectedInstitution && (
    selectedInstitution.guardia_semana_rate == null &&
    selectedInstitution.guardia_rate == null &&
    selectedInstitution.guardia_finde_rate == null &&
    selectedInstitution.guardia_feriado_rate == null
  );

  // Day-type breakdown (desglose): only when the institution HAS ≥1 rate AND
  // the guardia crosses 2+ day types (weekday/weekend/holiday mix). Reuses the
  // SAME medical-day classification the preview effect uses, but only drives a
  // presentational listing. Conditions for null (no breakdown):
  //  - activityMode !== 'guardia', or incomplete range, or backwards range
  //  - institutionHasNoRates (notice is shown instead)
  //  - fewer than 2 segments with hours > 0 (single day type → nothing to break)
  let rateBreakdown: RateBreakdownSegment[] | null = null;
  if (
    activityMode === 'guardia' &&
    !institutionHasNoRates &&
    selectedInstitution &&
    date && startTime && endDate && endTime &&
    parseInt(hours) > 0
  ) {
    const start = new Date(date + 'T' + startTime);
    const end = new Date(endDate + 'T' + endTime);
    if (end > start) {
      // Rate fallbacks mirror the preview effect and the backend legacy rule
      // (actividades.py: finde_rate = guardia_finde_rate ?? guardia_rate):
      // findeRate falls back to the weekday rate, so legacy institutions
      // (only guardia_rate set) still get a weekend segment in the breakdown.
      const { split, semanaRate, findeRate, feriadoRate } = computeGuardiaBreakdown(
        start, end, selectedInstitution, null,
      );
      const segments: RateBreakdownSegment[] = [];
      if (split.weekdayHours > 0 && semanaRate != null) {
        segments.push({ hours: split.weekdayHours, rate: semanaRate, labelKey: 'diaSemana' });
      }
      if (split.weekendHours > 0 && findeRate != null) {
        segments.push({ hours: split.weekendHours, rate: findeRate, labelKey: 'diaFinde' });
      }
      if (split.feriadoHours > 0 && feriadoRate != null) {
        segments.push({ hours: split.feriadoHours, rate: feriadoRate, labelKey: 'diaFeriado' });
      }
      if (segments.length >= 2) rateBreakdown = segments;
    }
  }

  return {
    amount, setAmount, date, setDate, institution, status,
    notes, setNotes, startTime, setStartTime, endTime, setEndTime,
    endDate, setEndDate, hours, setHours, hourlyRate, setHourlyRate,
    extras, addExtra, updateExtra, removeExtra, extraTotal,
    shiftSubtype, setShiftSubtype, selectedInstitution,
    handleSelectInstitution, handleStatusToggle,
    formState, formAction, isPending, previewError,
    // New fields for extra mode
    activityMode, handleModeChange,
    conceptName, setConceptName,
    subItemName, setSubItemName, isSubItemEdit, subItemType,
    // Rate info (flat-rate notice + day-type breakdown)
    institutionHasNoRates, rateBreakdown,
  };
}
