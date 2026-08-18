import { AlertTriangle } from "lucide-react";
import { Button } from "../ui/Button";
import { translations, type Language } from "../../translations";

interface ConfirmData {
  id: string;
  name: string;
  email: string;
}

interface AdminConfirmModalProps {
  show: boolean;
  data: ConfirmData | null;
  mode: 'delete' | 'reset';
  onClose: () => void;
  onConfirm: () => void;
  language: Language;
}

export function AdminConfirmModal({ show, data, mode, onClose, onConfirm, language }: AdminConfirmModalProps) {
  const t = translations[language];
  if (!show || !data) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        {mode === 'delete' ? (
          <>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{t.eliminarUsuario}</h3>
            <p className="text-sm text-slate-500 mb-4">{t.confirmarEliminarMsg}</p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{t.resetearContrasena}</h3>
            <p className="text-sm text-slate-500 mb-4">{t.resetearContrasenaMsg}</p>
          </>
        )}
        <div className="bg-slate-50 rounded-xl p-4 mb-5">
          <p className="font-bold text-slate-900 text-base">{data.name}</p>
          <p className="text-sm text-slate-500 mt-1">{data.email}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>{t.cancelar}</Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={onConfirm}>
            {mode === 'delete' ? t.siEliminar : t.siResetear}
          </Button>
        </div>
      </div>
    </div>
  );
}
