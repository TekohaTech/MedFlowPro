import { useState, useEffect } from 'react';
import { Transaction, UserProfile, UserSettings } from '../types';
import { api } from '../services/api';
import { GeminiService } from '../services/gemini';
import { useAuth } from './useAuth';
import { useTransactions } from './useTransactions';

export type ViewState = "inicio" | "perfil" | "reportes" | "stats" | "admin" | "login" | "registro";

interface UseAppStateReturn {
  auth: ReturnType<typeof useAuth>;
  tx: ReturnType<typeof useTransactions>;
  activeView: ViewState;
  isFormOpen: boolean;
  prefilledDate: string | undefined;
  editingTransaction: Transaction | null;
  insight: string;
  profile: UserProfile;
  isAdmin: boolean;
  settings: UserSettings;
  isLoading: boolean;
  handleAddTransaction: (newTx: Partial<Transaction>) => Promise<void>;
  openForm: (date?: string, txVal?: Transaction) => void;
  closeForm: () => void;
  handleViewChange: (view: string) => void;
  handleUpdateProfile: (p: Partial<UserProfile>) => Promise<void>;
  handleUpdateSettings: (s: Partial<UserSettings>) => void;
}

export function useAppState(): UseAppStateReturn {
  const [activeView, setActiveView] = useState<ViewState>("inicio");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>();
  const [insight, setInsight] = useState<string>("Analizando tus finanzas...");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: "Dr. Rodriguez",
    specialty: "Cardiología",
    institution: "Hospital Italiano",
    avatar: "masc_doctor",
  });
  const [isAdmin, setIsAdmin] = useState(false);

  // Load persisted settings from localStorage
  const loadSettings = (): UserSettings => {
    try {
      const saved = localStorage.getItem('medflow_settings');
      if (saved) return { language: 'es', darkMode: false, currency: 'ARS', ...JSON.parse(saved) };
    } catch {}
    return { language: 'es', darkMode: false, currency: 'ARS' };
  };

  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  const tx = useTransactions();
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  useEffect(() => {
    if (auth.isAuthenticated) {
      setIsLoading(true);
      (async () => {
        try {
          const actividades = await api.getActividades();
          const DEV_MODE = import.meta.env.DEV_MODE || localStorage.getItem('dev_mode_seeded');
          if (actividades.length === 0 && DEV_MODE !== 'true') {
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
              try { await api.createActividad({ type: a.type as any, institution: a.institution, date: a.date, amount: a.amount, notes: a.notes, hours: a.hours }); } catch {}
            }
            localStorage.setItem('dev_mode_seeded', 'true');
          }
          await tx.fetchTransactions();
        } catch (error) {
          console.error("Error fetching data:", error);
          if (error instanceof Error && error.message.includes("401")) {
            auth.handleLogout();
          }
        }
      })();
      (async () => {
        try {
          const userProfile = await api.getProfile();
          setProfile({
            name: userProfile.full_name || "Dr. Usuario",
            specialty: userProfile.specialty || "Medicina",
            institution: userProfile.institution || "",
            avatar: userProfile.avatar || "masc_doctor",
          });
          setIsAdmin(userProfile.is_admin || false);
          if (userProfile.is_admin) setActiveView("admin");
        } catch {}
      })();
      tx.fetchInstitutions().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [auth.isAuthenticated]);

  const gemini = GeminiService.getInstance();

  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const text = await gemini.getFinancialInsight(tx.transactions);
        setInsight(text);
      } catch (e) {
        setInsight("Optimiza tus turnos para aumentar un 15% tus ingresos el próximo mes.");
      }
    };
    fetchInsight();
  }, [tx.transactions]);

  const handleAddTransaction = async (newTx: Partial<Transaction>) => {
    await tx.handleAddTransaction(newTx, editingTransaction?.id);
  };

  const openForm = (date?: string, txVal?: Transaction) => {
    setEditingTransaction(txVal || null);
    setPrefilledDate(date);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setPrefilledDate(undefined);
    setEditingTransaction(null);
  };

  const handleViewChange = (view: string) => {
    setActiveView(view as ViewState);
  };

  const handleUpdateProfile = async (p: Partial<UserProfile>) => {
    setProfile({ ...profile, ...p });
    try { await api.updateProfile(p); } catch {}
  };

  const handleUpdateSettings = (s: Partial<UserSettings>) => {
    const updated = { ...settings, ...s };
    setSettings(updated);
    try { localStorage.setItem('medflow_settings', JSON.stringify(updated)); } catch {}
  };

  return {
    auth, tx,
    activeView, isFormOpen, prefilledDate, editingTransaction,
    insight, profile, isAdmin, settings, isLoading,
    handleAddTransaction, openForm, closeForm, handleViewChange,
    handleUpdateProfile, handleUpdateSettings,
  };
}
