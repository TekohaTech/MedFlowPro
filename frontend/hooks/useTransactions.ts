import { useState } from 'react';
import { Transaction, PaymentStatus, ShiftType, Institution } from '../types';
import { api } from '../services/api';

interface ApiActividad {
  _id: string;
  type: string;
  institution: string;
  date: string;
  amount: number;
  status: string;
  notes?: string;
  hours?: number;
  start_time?: string;
  end_time?: string;
  end_date?: string;
  shift_subtype?: string;
  concept_name?: string;
  weekday_hours?: number;
  weekend_hours?: number;
}

type ActivityApi = Pick<typeof api, 'updateActividad' | 'createActividad'>;

interface ActivitySaveResult {
  kind: 'updated' | 'created';
  record: ApiActividad;
}

/**
 * Create-vs-update routing contract: a transaction that carries a real id is
 * an UPDATE (PUT via updateActividad), one without an id is a CREATE (POST via
 * createActividad). Same-day extras loaded on guardia edit keep their id
 * (`isNew: false` in the form) and MUST update; newly added extras have no id
 * (`isNew: true`) and MUST be created — routing them the wrong way duplicates
 * records or overwrites unrelated ones.
 */
export async function saveActivity(activityApi: ActivityApi, newTx: Partial<Transaction>): Promise<ActivitySaveResult> {
  const editingId = newTx.id;
  const getApiType = (t: ShiftType | undefined): string => {
    if (t === ShiftType.ACTIVE) return "guardia";
    if (t === ShiftType.CONSULTATION) return "procedimiento";
    if (t === ShiftType.EXTRA) return "extra";
    return "interconsulta";
  };

  if (editingId) {
    const record = await activityApi.updateActividad(editingId, {
      type: getApiType(newTx.type),
      institution: newTx.institution,
      date: newTx.date,
      amount: newTx.amount,
      hours: newTx.type === ShiftType.EXTRA ? undefined : newTx.duration,
      hourly_rate: newTx.hourlyRate || undefined,
      notes: newTx.notes,
      status: newTx.status,
      start_time: newTx.startTime,
      end_time: newTx.endTime,
      end_date: newTx.endDate,
      shift_subtype: newTx.shiftSubtype,
      concept_name: newTx.conceptName,
      weekday_hours: newTx.weekdayHours,
      weekend_hours: newTx.weekendHours,
    });
    return { kind: 'updated', record };
  }

  const apiType = getApiType(newTx.type);
  const record = await activityApi.createActividad({
    type: apiType,
    institution: newTx.institution || "Nueva Institución",
    date: newTx.date || new Date().toISOString().split("T")[0],
    amount: newTx.amount || 0,
    hours: apiType === "extra" ? undefined : newTx.duration,
    hourly_rate: newTx.hourlyRate || undefined,
    notes: newTx.notes,
    shift_subtype: newTx.shiftSubtype,
    start_time: newTx.startTime,
    end_time: newTx.endTime,
    end_date: newTx.endDate,
    procedure_name: newTx.procedureName,
    quantity: newTx.quantity,
    unit_value: newTx.unitValue,
    specialty: newTx.specialty,
    concept_name: newTx.conceptName,
    weekday_hours: newTx.weekdayHours,
    weekend_hours: newTx.weekendHours,
  });
  return { kind: 'created', record };
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

  const mapApiActivity = (a: ApiActividad): Transaction => {
    let type: ShiftType;
    if (a.type === "guardia") type = ShiftType.ACTIVE;
    else if (a.type === "procedimiento") type = ShiftType.CONSULTATION;
    else if (a.type === "extra") type = ShiftType.EXTRA;
    else type = ShiftType.PASSIVE;

    return {
      id: a._id,
      institution: a.institution,
      type,
      date: a.date,
      amount: a.amount,
      status: a.status === "pagado" ? PaymentStatus.PAID : PaymentStatus.PENDING,
      notes: a.notes,
      duration: a.hours,
      location: a.institution,
      startTime: a.start_time || undefined,
      endTime: a.end_time || undefined,
      endDate: a.end_date || undefined,
      shiftSubtype: a.shift_subtype === 'activa' || a.shift_subtype === 'pasiva' ? a.shift_subtype : undefined,
      conceptName: a.concept_name || undefined,
      weekdayHours: a.weekday_hours || undefined,
      weekendHours: a.weekend_hours || undefined,
    };
  };

  const fetchTransactions = async (): Promise<Transaction[]> => {
    const actividades = await api.getActividades();

    const txs = actividades.map(mapApiActivity);
    setTransactions(txs);
    return txs;
  };

  const fetchInstitutions = async () => {
    try {
      const inst = await api.getInstitutions();
      setInstitutions(inst.filter((i: Institution) => i.is_active));
    } catch {}
  };

  const handleAddTransaction = async (newTx: Partial<Transaction>) => {
    try {
      const { kind, record } = await saveActivity(api, newTx);
      if (kind === 'updated') {
        setTransactions(prev => prev.map((tx) =>
          tx.id === newTx.id
            ? ({ ...tx, institution: record.institution, date: record.date, amount: record.amount,
                notes: record.notes, status: record.status as PaymentStatus,
                startTime: record.start_time || undefined, endTime: record.end_time || undefined,
                endDate: record.end_date || undefined, shiftSubtype: record.shift_subtype || undefined,
                conceptName: record.concept_name || undefined,
                weekdayHours: record.weekday_hours || undefined,
                weekendHours: record.weekend_hours || undefined } as Transaction)
            : tx,
        ));
      } else {
        const tx: Transaction = {
          id: record._id, institution: record.institution,
          type: newTx.type || ShiftType.ACTIVE,
          date: record.date, amount: record.amount,
          status: PaymentStatus.PENDING, notes: record.notes,
          duration: record.hours, location: record.institution,
          endDate: record.end_date || undefined,
          startTime: record.start_time || undefined,
          endTime: record.end_time || undefined,
          shiftSubtype: record.shift_subtype as 'activa' | 'pasiva' | undefined,
          conceptName: record.concept_name || undefined,
          weekdayHours: record.weekday_hours || undefined,
          weekendHours: record.weekend_hours || undefined,
        };
        setTransactions(prev => [tx, ...prev]);
      }
    } catch (error) {
      console.error("Error saving:", error);
      throw error;
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await api.deleteActividad(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      await api.updateActividad(id, updates);
      setTransactions(prev => prev.map((tx) =>
        tx.id === id ? ({ ...tx, ...updates } as Transaction) : tx,
      ));
    } catch (error) {
      console.error("Error updating:", error);
    }
  };

  const handleInstitutionChange = (inst: Institution) => {
    setInstitutions(prev => {
      const exists = prev.find(i => i.id === inst.id);
      if (exists) return prev.map(i => i.id === inst.id ? inst : i);
      return [inst, ...prev];
    });
  };

  const handleInstitutionDelete = (id: string) => {
    setInstitutions(prev => prev.filter(i => i.id !== id));
  };

  return {
    transactions, setTransactions, institutions,
    fetchTransactions, fetchInstitutions,
    handleAddTransaction, handleDeleteTransaction, handleUpdateTransaction,
    handleInstitutionChange, handleInstitutionDelete,
  };
}
