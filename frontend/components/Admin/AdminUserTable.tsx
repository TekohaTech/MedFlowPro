import { Loader2, Shield, Eye, EyeOff, Mail, Phone, KeyRound, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import { translations, type Language } from "../../translations";

interface AdminUser {
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

interface AdminUserTableProps {
  users: AdminUser[];
  toggling: string | null;
  resetting: string | null;
  deleting: string | null;
  onToggleActive: (userId: string, currentActive: boolean) => void;
  onResetPassword: (user: AdminUser) => void;
  onDelete: (userId: string) => void;
  language: Language;
}

function getStatusIcon(status: string) {
  if (status === "deleted") return <EyeOff className="w-3.5 h-3.5" />;
  if (status === "inactive") return <Eye className="w-3.5 h-3.5" />;
  return <Shield className="w-3.5 h-3.5" />;
}

export function AdminUserTable({ users, toggling, resetting, deleting, onToggleActive, onResetPassword, onDelete, language }: AdminUserTableProps) {
  const t = translations[language];

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700 border-green-200",
    inactive: "bg-slate-100 text-slate-600 border-slate-200",
    suspended: "bg-yellow-100 text-yellow-700 border-yellow-200",
    deleted: "bg-red-100 text-red-700 border-red-200",
  };

  const statusLabels: Record<string, string> = {
    active: t.activo, inactive: t.inactivo, suspended: t.suspendido, deleted: t.eliminado,
  };

  function isAdminText(user: AdminUser): string {
    if (user.is_admin) return "Admin • " + (user.status || "active");
    return user.specialty || user.institution || t.medico;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-500">{t.usuario}</th>
            <th className="text-left py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-500">{t.contactoLabel}</th>
            <th className="text-center py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-500">{t.estadoLabel}</th>
            <th className="text-center py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-500">{t.acciones}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <td className="py-4 px-4">
                <div className="font-bold text-slate-900">{user.full_name || t.sinNombre}</div>
                <div className="text-xs text-slate-400 mt-0.5">{isAdminText(user)}</div>
              </td>
              <td className="py-4 px-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-600">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-600">{user.phone}</span>
                    </div>
                  )}
                </div>
              </td>
              <td className="py-4 px-4 text-center">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${statusColors[user.status] || statusColors.inactive}`}>
                  {getStatusIcon(user.status)}
                  {statusLabels[user.status] || user.status}
                </span>
              </td>
              <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  {user.is_deleted ? (
                    <span className="text-xs text-slate-400 italic">{t.sinAcceso}</span>
                  ) : (
                    <>
                      <Button size="sm"
                        onClick={() => onToggleActive(user.id, user.is_active)}
                        disabled={toggling === user.id}
                        className={user.is_active ? "bg-yellow-500 hover:bg-yellow-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"}>
                        {toggling === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : user.is_active ? t.suspender : t.activar}
                      </Button>
                      <Button variant="ghost" className="text-slate-400 hover:text-blue-600"
                        onClick={() => onResetPassword(user)}
                        disabled={resetting === user.id}
                        title={t.resetearContrasena}>
                        {resetting === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" className="text-red-400 hover:text-red-600"
                        onClick={() => onDelete(user.id)}
                        disabled={deleting === user.id}
                        title={t.eliminar}>
                        {deleting === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
