import { Institution, APITokenResponse, ActividadStats, MonthlyRow, Notification } from '../types';
import { PROFILE_STORAGE_KEY } from '../lib/profileCache';

// Dev: relative base ('') so the app calls '/api/...' and the Vite dev proxy
// forwards to the backend — this works from the desktop AND from a phone on
// the LAN (localhost would resolve to the phone itself). Production keeps the
// previous behavior: VITE_API_URL if set, else localhost:8000.
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:8000');

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

// Backend wire shapes (snake_case, FastAPI response_model_by_alias=True).
interface ApiProfile {
  id: string;
  email: string;
  full_name?: string;
  specialty?: string;
  institution?: string;
  avatar?: string;
  is_admin?: boolean;
  created_at?: string;
}

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

interface ApiInstitution {
  _id?: string;
  id?: string;
  name: string;
  color?: string | null;
  guardia_rate?: number | null;
  guardia_semana_rate?: number | null;
  guardia_finde_rate?: number | null;
  guardia_feriado_rate?: number | null;
  procedimiento_rate?: number | null;
  interconsulta_rate?: number | null;
  is_active?: boolean;
}

interface ApiAdminUser {
  id: string;
  email: string;
  full_name: string | null;
  specialty: string | null;
  institution: string | null;
  phone: string | null;
  status: string;
  is_active: boolean;
  is_admin: boolean;
  is_deleted: boolean;
  created_at: string | null;
}

class APIService {
  private getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}${endpoint}`;
    console.log(`[API] ${options.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (response.status === 401 && endpoint !== '/api/auth/refresh' && endpoint !== '/api/auth/login') {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          const newToken = this.getToken();
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
          });
          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }
        window.dispatchEvent(new CustomEvent('sessionExpired'));
        throw new Error('Sesión expirada');
      }

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        console.log(`[API] Error ${response.status}:`, contentType);

        if (contentType.includes('application/json')) {
          const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
          throw new Error(error.detail || error.error || error.message || `Error ${response.status}`);
        } else {
          const text = await response.text().catch(() => 'Error desconocido');
          throw new Error(text || `Error ${response.status}`);
        }
      }

      return response.json();
    } catch (err) {
      console.error(`[API] Error en ${endpoint}:`, err);
      throw err;
    }
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  // ==================== AUTH ====================
  async login(email: string, password: string): Promise<APITokenResponse> {
    const data = await this.request<APITokenResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data;
  }

  async register(userData: {
    email: string;
    password: string;
    password_confirm: string;
    full_name: string;
    specialty?: string;
    institution?: string;
    phone?: string;
  }): Promise<APITokenResponse> {
    const data = await this.request<APITokenResponse>('/api/auth/register', {
      method: 'POST',
      body: userData,
    });
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data;
  }

  async getProfile(): Promise<ApiProfile> {
    return this.request<ApiProfile>('/api/auth/me');
  }

  async updateProfile(profileData: {
    full_name?: string;
    specialty?: string;
    institution?: string;
    avatar?: string;
  }): Promise<ApiProfile> {
    return this.request<ApiProfile>('/api/auth/me', {
      method: 'PUT',
      body: profileData,
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message?: string }> {
    return this.request<{ message?: string }>('/api/auth/change-password', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
    });
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Never leak the previous user's cached profile to the next login on this device.
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  }

  // ==================== ACTIVIDADES ====================
  async getActividades(): Promise<ApiActividad[]> {
    return this.request<ApiActividad[]>('/api/actividades/');
  }

  async getActividad(id: string): Promise<ApiActividad> {
    return this.request<ApiActividad>(`/api/actividades/${id}`);
  }

  async createActividad(actividad: {
    type: string;
    institution: string;
    date: string;
    amount: number;
    hours?: number;
    hourly_rate?: number;
    notes?: string;
    start_time?: string;
    end_time?: string;
    end_date?: string;
    procedure_name?: string;
    quantity?: number;
    unit_value?: number;
    specialty?: string;
    shift_subtype?: string;
    concept_name?: string;
    weekday_hours?: number;
    weekend_hours?: number;
  }): Promise<ApiActividad> {
    return this.request<ApiActividad>('/api/actividades/', {
      method: 'POST',
      body: actividad,
    });
  }

  async updateActividad(id: string, actividad: Record<string, unknown>): Promise<ApiActividad> {
    return this.request<ApiActividad>(`/api/actividades/${id}`, {
      method: 'PUT',
      body: actividad,
    });
  }

  async deleteActividad(id: string): Promise<void> {
    return this.request<void>(`/api/actividades/${id}`, {
      method: 'DELETE',
    });
  }

  async getStats(): Promise<ActividadStats> {
    return this.request<ActividadStats>('/api/actividades/stats');
  }

  async getMonthlyComparison(year?: number): Promise<MonthlyRow[]> {
    const params = year ? `?year=${year}` : '';
    return this.request<MonthlyRow[]>(`/api/actividades/stats/monthly${params}`);
  }

  // ==================== ADMIN ====================
  async getAllUsers(): Promise<ApiAdminUser[]> {
    return this.request<ApiAdminUser[]>('/api/auth/admin/users');
  }

  async getUsersWithDebts(): Promise<ApiAdminUser[]> {
    return this.request<ApiAdminUser[]>('/api/auth/admin/users-with-debts');
  }

  async toggleUserActive(userId: string, isActive: boolean): Promise<ApiAdminUser> {
    return this.request<ApiAdminUser>(`/api/auth/admin/users/${userId}/toggle-active`, {
      method: 'PUT',
      body: { is_active: isActive },
    });
  }

  async deleteUser(userId: string): Promise<void> {
    return this.request<void>(`/api/auth/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async updateUser(userId: string, data: Record<string, unknown>): Promise<ApiAdminUser> {
    return this.request<ApiAdminUser>(`/api/auth/admin/users/${userId}`, {
      method: 'PUT',
      body: data,
    });
  }

  async resetPassword(userId: string): Promise<{new_password: string}> {
    return this.request<{new_password: string}>(`/api/auth/admin/users/${userId}/reset-password`, {
      method: 'POST',
    });
  }

  // ==================== INSTITUCIONES ====================
  /**
   * Normalize an institution from the API: the backend serializes with
   * FastAPI's response_model_by_alias=True, so the JSON has _id instead of id.
   */
  private normalizeInstitution(raw: ApiInstitution): Institution {
    return {
      id: raw._id ?? raw.id ?? '',
      name: raw.name,
      color: raw.color ?? null,
      guardia_rate: raw.guardia_rate,
      guardia_semana_rate: raw.guardia_semana_rate,
      guardia_finde_rate: raw.guardia_finde_rate,
      guardia_feriado_rate: raw.guardia_feriado_rate,
      procedimiento_rate: raw.procedimiento_rate,
      interconsulta_rate: raw.interconsulta_rate,
      is_active: raw.is_active ?? true,
    };
  }

  async getInstitutions(): Promise<Institution[]> {
    const raw = await this.request<ApiInstitution[]>('/api/institutions/');
    return raw.map(r => this.normalizeInstitution(r));
  }

  async createInstitution(data: { name: string; color?: string | null; guardia_rate?: number | null; guardia_semana_rate?: number | null; guardia_finde_rate?: number | null; guardia_feriado_rate?: number | null; procedimiento_rate?: number | null; interconsulta_rate?: number | null }): Promise<Institution> {
    const raw = await this.request<ApiInstitution>('/api/institutions/', {
      method: 'POST',
      body: data,
    });
    return this.normalizeInstitution(raw);
  }

  async updateInstitution(id: string, data: { name?: string; color?: string | null; guardia_rate?: number | null; guardia_semana_rate?: number | null; guardia_finde_rate?: number | null; guardia_feriado_rate?: number | null; procedimiento_rate?: number | null; interconsulta_rate?: number | null; is_active?: boolean }): Promise<Institution> {
    const raw = await this.request<ApiInstitution>(`/api/institutions/${id}`, {
      method: 'PUT',
      body: data,
    });
    return this.normalizeInstitution(raw);
  }

  async deleteInstitution(id: string): Promise<void> {
    return this.request<void>(`/api/institutions/${id}`, {
      method: 'DELETE',
    });
  }

  async recalculatePending(id: string, from_date: string): Promise<{ updated_count: number; institution: string }> {
    return this.request<{ updated_count: number; institution: string }>(
      `/api/institutions/${id}/recalculate-pending?from_date=${encodeURIComponent(from_date)}`,
      { method: 'POST' },
    );
  }

  // ==================== NOTIFICACIONES ====================
  async createNotification(data: {
    target_user_id?: string | null;
    target_all?: boolean;
    type: string;
    title: string;
    message: string;
  }): Promise<{created: number; message: string}> {
    return this.request<{created: number; message: string}>('/api/notifications', {
      method: 'POST',
      body: data,
    });
  }

  async getMyNotifications(unreadOnly = false): Promise<Notification[]> {
    return this.request<Notification[]>(
      `/api/notifications/mine?unread_only=${unreadOnly}`,
    );
  }

  async getUnreadCount(): Promise<{count: number}> {
    return this.request<{count: number}>('/api/notifications/unread-count');
  }

  async markNotificationRead(id: string): Promise<{message: string}> {
    return this.request<{message: string}>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }
}

export const api = new APIService();
