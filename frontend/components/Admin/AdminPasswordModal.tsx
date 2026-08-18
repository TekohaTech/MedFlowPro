import { KeyRound, Check, Copy } from "lucide-react";
import { Button } from "../ui/Button";
import { translations, type Language } from "../../translations";

interface AdminPasswordModalProps {
  show: boolean;
  password: string;
  userName: string;
  userEmail: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
  language: Language;
}

export function AdminPasswordModal({ show, password, userName, userEmail, copied, onCopy, onClose, language }: AdminPasswordModalProps) {
  const t = translations[language];
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center" onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-7 h-7 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">{t.contrasenaGenerada}</h3>
        <p className="font-semibold text-slate-900">{userName}</p>
        <p className="text-xs text-slate-400 mb-5">{userEmail}</p>
        <div className="bg-slate-100 rounded-xl p-4 mb-5">
          <span className="text-2xl font-mono font-bold text-slate-900 tracking-widest select-all">{password}</span>
        </div>
        <Button className="w-full" onClick={onCopy}>
          {copied ? <><Check className="w-5 h-5" /> {t.copiado}</> : <><Copy className="w-5 h-5" /> {t.copiarContrasena}</>}
        </Button>
        <Button variant="ghost" className="w-full mt-2 text-sm" onClick={onClose}>{t.cerrar}</Button>
      </div>
    </div>
  );
}
