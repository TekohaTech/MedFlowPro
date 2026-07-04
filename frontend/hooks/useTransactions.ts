import { useState } from 'react';
import { Transaction, PaymentStatus, ShiftType, Institution } from '../types';
import { api } from '../services/api';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);

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

    if (actividades.length === 0) {
      const seeded = localStorage.getItem('dev_mode_seeded');
      if (seeded !== 'true') {
        const mockData = [
          { type: "guardia", institution: "Hospital Italiano", date: "2026-05-01", amount: 25000, status: "pagado", notes: "Guardia de 12hs", hours: 12 },
          { type: "guardia", institution: "Sanatorio Güemes", date: "2026-05-03", amount: 20000, status: "pagado", notes: "Guardia de 12hs", hours: 12 },
          { type: "procedimiento", institution: "Clínica Olivos", date: "2026-05-05", amount: 15000, status: "pendiente", notes: "Cateterismo diagnóstico", hours: 2 },
          { type: "interconsulta", institution: "H. Británico", date: "2026-05-07", amount: 18000, status: "pagado", notes: "Interconsulta cardiology", hours: 1 },
          { type: "guardia", institution: "Hospital Italiano", date: "2026-04-28", amount: 25000, status: "pagado", notes: "Guardia de 12hs", hours: 12 },
          { type: "procedimiento", institution: "Clínica Olivos", date: "2026-04-25", amount: 22000, status: "pagado", notes: "Angioplastia", hours: 3 },
          { type: "interconsulta", institution: "Sanatorio Güemes", date: "2026-04-22", amount: 12000, status: "pendiente", notes: "Interconsulta neumonología", hours: 1 },
          { type: "guardia", institution: "H. Británico", date: "2026-04-15", amount: 20000, status: "pagado", notes: "Guardia de 12hs", hours: 12 },
        ];
        for (const a of mockData) {
          try { await api.createActividad({ type: a.type, institution: a.institution, date: a.date, amount: a.amount, notes: a.notes, hours: a.hours }); } catch {}
        }
        localStorage.setItem('dev_mode_seeded', 'true');
        const recreated = await api.getActividades();
        const txs = recreated.map(mapApiActivity);
        setTransactions(txs);
        return txs;
      }
    }

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

  const handleAddTransaction = async (newTx: Partial<Transaction>, editingId?: string) => {
    try {
      const getApiType = (t: ShiftType | undefined): string => {
        if (t === ShiftType.ACTIVE) return "guardia";
        if (t === ShiftType.CONSULTATION) return "procedimiento";
        if (t === ShiftType.EXTRA) return "extra";
        return "interconsulta";
      };

      if (editingId) {
        const updated = await api.updateActividad(editingId, {
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
        setTransactions(prev => prev.map((tx) =>
          tx.id === editingId
            ? ({ ...tx, institution: updated.institution, date: updated.date, amount: updated.amount,
                notes: updated.notes, status: updated.status,
                startTime: updated.start_time || undefined, endTime: updated.end_time || undefined,
                endDate: updated.end_date || undefined, shiftSubtype: updated.shift_subtype || undefined,
                conceptName: updated.concept_name || undefined,
                weekdayHours: updated.weekday_hours || undefined,
                weekendHours: updated.weekend_hours || undefined } as Transaction)
            : tx,
        ));
      } else {
        const apiType = getApiType(newTx.type);
        const created = await api.createActividad({
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
        const tx: Transaction = {
          id: created._id, institution: created.institution,
          type: newTx.type || ShiftType.ACTIVE,
          date: created.date, amount: created.amount,
          status: PaymentStatus.PENDING, notes: created.notes,
          duration: created.hours, location: created.institution,
          endDate: created.end_date || undefined,
          startTime: created.start_time || undefined,
          endTime: created.end_time || undefined,
          shiftSubtype: created.shift_subtype || undefined,
          conceptName: created.concept_name || undefined,
          weekdayHours: created.weekday_hours || undefined,
          weekendHours: created.weekend_hours || undefined,
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
