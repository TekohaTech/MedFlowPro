
export enum ShiftType {
  ACTIVE = 'Activa',
  PASSIVE = 'Pasiva',
  CONSULTATION = 'Consultorio',
  HOME_VISIT = 'Visita Domicilio',
  EXTRA = 'extra'
}

export enum ActivityType {
  GUARDIA = 'guardia',
  PROCEDIMIENTO = 'procedimiento',
  INTERCONSULTA = 'interconsulta',
  EXTRA = 'extra'
}

export enum PaymentStatus {
  PAID = 'pagado',
  PENDING = 'pendiente'
}

// ==================== API TYPES (Backend Integration) ====================

export interface UserProfile {
  name: string;
  specialty: string;
  institution: string;
  avatar: 'masc_formal' | 'masc_doctor' | 'masc_scrubs' | 'fem_formal' | 'fem_doctor' | 'fem_scrubs';
}

// API User Profile (from backend)
export interface APIUserProfile {
  id: string;
  email: string;
  full_name: string;
  specialty?: string;
  institution?: string;
  created_at?: string;
}

// API Token Response
export interface APITokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserSettings {
  language: 'es' | 'en';
  darkMode: boolean;
  currency: string;
}

export interface BaseActividad {
  id: string;
  type: ActivityType;
  institution: string;
  date: string;
  amount: number;
  status: PaymentStatus;
  notes?: string;
  createdAt: string;
  synced?: boolean;
}

export interface ActividadGuardia extends BaseActividad {
  type: ActivityType.GUARDIA;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  hours: number;
  hourlyRate: number;
}

export interface ActividadProcedimiento extends BaseActividad {
  type: ActivityType.PROCEDIMIENTO;
  procedureName: string;
  quantity: number;
  unitValue: number;
  patientInitials?: string;
}

export interface ActividadInterconsulta extends BaseActividad {
  type: ActivityType.INTERCONSULTA;
  specialty: string;
  patientLocation: 'intraservicio' | 'extraservicio';
  complexity: boolean;
  patientInitials?: string;
}

export interface ActividadExtra extends BaseActividad {
  type: ActivityType.EXTRA;
  conceptName: string;
}

export type Actividad = ActividadGuardia | ActividadProcedimiento | ActividadInterconsulta | ActividadExtra;

export interface Transaction {
  id: string;
  institution: string;
  type: ShiftType;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  amount: number;
  status: PaymentStatus;
  notes?: string;
  duration?: number;
  location?: string;
  procedureName?: string;
  quantity?: number;
  unitValue?: number;
  specialty?: string;
  hours?: number;
  patientLocation?: 'intraservicio' | 'extraservicio';
  hourlyRate?: number;
  shiftSubtype?: 'activa' | 'pasiva';
  conceptName?: string;
  weekdayHours?: number;
  weekendHours?: number;
}

export interface Institution {
  id: string;
  name: string;
  color?: string | null;
  guardia_rate?: number | null;
  guardia_semana_rate?: number | null;
  guardia_finde_rate?: number | null;
  guardia_feriado_rate?: number | null;
  procedimiento_rate?: number | null;
  interconsulta_rate?: number | null;
  is_active: boolean;
}

export interface FinancialStats {
  totalMonthly: number;
  trendPercentage: number;
  projection: number;
  recentActivity: Transaction[];
}

export interface DashboardSummary {
  totalGuardias: number;
  totalProcedimientos: number;
  totalInterconsultas: number;
  grandTotal: number;
}

// ==================== NOTIFICACIONES ====================

export interface Notification {
  id: string;
  user_id: string;
  type: 'info' | 'warning' | 'alert';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// Backend Stats API Response
export interface ActividadStats {
  total_ingresos: number;
  total_guardias: number;
  total_procedimientos: number;
  total_interconsultas: number;
  Cobrado: number;
  Pendiente: number;
  mes_actual: string;
  anio_actual: number;
}

// Monthly comparison row
export interface MonthlyRow {
  month: string;
  total_ingresos: number;
  total_guardias: number;
  total_procedimientos: number;
  total_interconsultas: number;
  total_extras: number;
  cobrado: number;
  pendiente: number;
}

