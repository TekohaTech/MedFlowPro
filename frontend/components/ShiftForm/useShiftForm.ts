import { useState, useEffect, useActionState } from 'react';
import { ShiftType, Transaction, PaymentStatus, type Institution } from '../../types';

type ActivityMode = 'guardia' | 'extra';

interface ExtraActivity {
  id: string;
  type: 'procedimiento' | 'interconsulta';
  procedureName?: string;
  specialty?: string;
  amount: number;
  notes?: string;
  status: PaymentStatus;
}

interface ShiftFormState {
  error?: string;
}

export function useShiftForm(
  onSubmit: (tx: Partial<Transaction>) => void,
  editingTransaction: Transaction | undefined,
  transactions: Transaction[] | undefined,
  initialDate: string | undefined,
  institutions: Institution[],
  onClose: () => void,
  _language: string,
) {
  const initialMode: ActivityMode =
    editingTransaction?.type === ShiftType.EXTRA ||
    editingTransaction?.type === ShiftType.CONSULTATION ||
    editingTransaction?.type === ShiftType.PASSIVE
      ? 'extra'
      : 'guardia';
  const [activityMode, setActivityMode] = useState<ActivityMode>(initialMode);
  const [amount, setAmount] = useState<string>(editingTransaction ? editingTransaction.amount.toLocaleString('es-AR') : '');
  const [date, setDate] = useState<string>(editingTransaction ? editingTransaction.date : (initialDate || new Date().toISOString().split('T')[0]));
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
  const [endDate, setEndDate] = useState(editingTransaction?.endDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  })());
  const [hours, setHours] = useState<number>(editingTransaction?.duration || 12);
  const [hourlyRate, setHourlyRate] = useState<string>('');
  const [extras, setExtras] = useState<ExtraActivity[]>([]);
  const [shiftSubtype, setShiftSubtype] = useState<'activa' | 'pasiva'>('activa');
  const [conceptName, setConceptName] = useState(editingTransaction?.conceptName || '');
  const [applyWeekdayRule, setApplyWeekdayRule] = useState(true);

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
  const [weekdayHours, setWeekdayHours] = useState<number>(0);
  const [weekendHours, setWeekendHours] = useState<number>(0);

  useEffect(() => {
    // Solo cargar sub-actividades cuando EDITAMOS una GUARDIA (ACTIVE)
    if (editingTransaction && editingTransaction.type === ShiftType.ACTIVE && transactions) {
      const sameDayExtras = transactions.filter(t =>
        t.date === editingTransaction.date &&
        t.institution === editingTransaction.institution &&
        t.id !== editingTransaction.id &&
        (t.type === ShiftType.CONSULTATION || t.type === ShiftType.PASSIVE)
      );
      setExtras(sameDayExtras.map(t => ({
        id: t.id,
        type: t.type === ShiftType.CONSULTATION ? 'procedimiento' as const : 'interconsulta' as const,
        procedureName: t.notes?.startsWith('procedimiento') ? t.notes : undefined,
        specialty: t.notes?.startsWith('interconsulta') ? t.notes : undefined,
        amount: t.amount,
        notes: t.notes,
        status: t.status || PaymentStatus.PENDING,
      })));
    } else {
      setExtras([]);
    }
  }, [editingTransaction]);

  useEffect(() => {
    if (activityMode === 'guardia' && date && hours > 0 && startTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const start = new Date(date + 'T' + startTime);
      const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
      setEndDate(end.toISOString().split('T')[0]);
      setEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
    }
  }, [activityMode, date, hours, startTime]);

  useEffect(() => {
    if (activityMode === 'guardia') {
      if (hours > 0 && hourlyRate && hourlyRate.trim() !== '') {
        const rawRate = parseInt(hourlyRate.replace(/\D/g, '')) || 0;
        const et = extras.reduce((s, e) => s + e.amount, 0);
        const total = (hours * rawRate) + et;
        if (total > 0) setAmount(total.toLocaleString('es-AR'));
      }
    }
  }, [activityMode, hours, hourlyRate, extras]);

  // Calculate amount for extra mode with weekday/weekend split
  useEffect(() => {
    if (activityMode === 'guardia' && !applyWeekdayRule && endDate && endDate !== date) {
      const rawSemanaRate = parseInt(hourlyRate.replace(/\D/g, '')) || 0;
      const inst = institutions.find(i => i.name.toLowerCase().trim() === institution.toLowerCase().trim());
      const semanaRate = inst?.guardia_semana_rate ?? inst?.guardia_rate ?? rawSemanaRate;
      const findeRate = inst?.guardia_finde_rate ?? semanaRate;
      const total = (weekdayHours * (semanaRate || 0)) + (weekendHours * (findeRate || 0));
      if (total > 0) setAmount(total.toLocaleString('es-AR'));
    }
  }, [activityMode, applyWeekdayRule, endDate, date, weekdayHours, weekendHours, hourlyRate, institution, institutions]);

  useEffect(() => {
    if (initialDate && !editingTransaction) setDate(initialDate);
  }, [initialDate, editingTransaction]);

  const selectedInstitution = institutions.find(i =>
    i.name.toLowerCase().trim() === institution.toLowerCase().trim() && i.is_active
  );

  const handleSelectInstitution = (name: string) => {
    setInstitution(name);
    const inst = institutions.find(i => i.name.toLowerCase().trim() === name.toLowerCase().trim());
    if (inst) {
      const rate = inst.guardia_semana_rate ?? inst.guardia_rate;
      if (rate !== null && rate !== undefined) setHourlyRate(rate.toString());
    }
  };

  const addExtra = () => {
    setExtras([...extras, {
      id: Math.random().toString(36).slice(2),
      type: 'procedimiento',
      procedureName: '',
      amount: selectedInstitution?.procedimiento_rate || 0,
      notes: '',
      status: PaymentStatus.PENDING,
    }]);
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
      const cleanAmount = parseInt(rawAmount.replace(/\./g, '')) || 0;
      if (cleanAmount <= 0) return { error: 'Completá todos los campos obligatorios' };
      if (activityMode !== 'extra' && !institution) return { error: 'Completá todos los campos obligatorios' };

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
              return { error: 'El nombre del concepto es obligatorio para actividades extra' };
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

        const rawRate = parseInt((formData.get('hourly_rate') as string || hourlyRate).replace(/\D/g, '')) || 0;
        const fDate = formData.get('date') as string || date;
        const fEndDate = formData.get('end_date') as string || endDate;
        const fStartTime = formData.get('start_time') as string || startTime;
        const fEndTime = formData.get('end_time') as string || endTime;
        const fStatus = (formData.get('status') as string) === 'paid' ? PaymentStatus.PAID : PaymentStatus.PENDING;
        const fNotes = formData.get('notes') as string || notes;

        await onSubmit({
          amount: cleanAmount, date: fDate, endDate: fEndDate,
          startTime: fStartTime, endTime: fEndTime, institution,
          type: ShiftType.ACTIVE, status: fStatus, notes: fNotes,
          id: editingTransaction?.id, duration: hours, hourlyRate: rawRate, shiftSubtype,
          weekdayHours: applyWeekdayRule ? undefined : weekdayHours,
          weekendHours: applyWeekdayRule ? undefined : weekendHours,
        });

        for (const extra of extras) {
          if (extra.amount > 0) {
            await onSubmit({
              amount: extra.amount, date: fDate, institution,
              type: extra.type === 'procedimiento' ? ShiftType.CONSULTATION : ShiftType.PASSIVE,
              status: extra.status,
              notes: [extra.type === 'procedimiento' ? extra.procedureName : extra.specialty, extra.notes].filter(Boolean).join(': '),
              procedureName: extra.type === 'procedimiento' ? extra.procedureName : undefined,
              specialty: extra.type === 'interconsulta' ? extra.specialty : undefined,
            });
          }
        }
        onClose();
        return {};
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Error al guardar los datos' };
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

  // Determine if we should show the weekday override checkbox
  const isMultiDay = endDate && endDate !== date;
  const showWeekdayOverride = activityMode === 'guardia' && isMultiDay;

  return {
    amount, setAmount, date, setDate, institution, status,
    notes, setNotes, startTime, setStartTime, endTime, setEndTime,
    endDate, setEndDate, hours, setHours, hourlyRate, setHourlyRate,
    extras, addExtra, updateExtra, removeExtra, extraTotal,
    shiftSubtype, setShiftSubtype, selectedInstitution,
    handleSelectInstitution, handleStatusToggle,
    formState, formAction, isPending,
    // New fields for extra mode
    activityMode, handleModeChange,
    conceptName, setConceptName,
    subItemName, setSubItemName, isSubItemEdit, subItemType,
    // New fields for weekday override
    applyWeekdayRule, setApplyWeekdayRule,
    weekdayHours, setWeekdayHours, weekendHours, setWeekendHours,
    showWeekdayOverride,
  };
}
