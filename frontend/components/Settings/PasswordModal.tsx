import { Lock, Check, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { translations, type Language } from '../../translations';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { usePasswordModal } from './usePasswordModal';

interface PasswordModalProps {
  open: boolean;
  onClose: () => void;
  language: Language;
}

export function PasswordModal({ open, onClose, language }: PasswordModalProps) {
  const {
    showCurrent, setShowCurrent,
    showNew, setShowNew,
    showConfirm, setShowConfirm,
    pwState, pwAction, pwPending,
  } = usePasswordModal(onClose);

  const t = translations[language];
  const inputClass = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all outline-none';

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.cambiarContrasena}</h3>
            <p className="text-xs text-slate-400">{t.passwordModalDesc}</p>
          </div>
        </div>

        <form action={pwAction} className="space-y-4">
          <input type="text" className="hidden" autoComplete="off" />

          <div>
            <Label variant="setting" className="mb-1">{t.contrasenaActual}</Label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'} name="current_password" defaultValue="" autoComplete="off" className={cn(inputClass, 'pr-12')} placeholder={t.contrasenaActualPlaceholder} />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1">
                {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <Label variant="setting" className="mb-1">{t.nuevaContrasena}</Label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} name="new_password" defaultValue="" autoComplete="off" className={cn(inputClass, 'pr-12')} placeholder={t.nuevaContrasenaPlaceholder} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1">
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <Label variant="setting" className="mb-1">{t.confirmarNuevaContrasena}</Label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} name="confirm_password" defaultValue="" autoComplete="off" className={cn(inputClass, 'pr-12')} placeholder={t.confirmarNuevaContrasenaPlaceholder} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1">
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {pwState.error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">{pwState.error}</p>
            </div>
          )}

          {pwState.success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">{t.contrasenaActualizada}</p>
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">{t.cancelar}</Button>
            <Button type="submit" disabled={pwPending} className="flex-1">
              {pwPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t.cambiarContrasena}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
