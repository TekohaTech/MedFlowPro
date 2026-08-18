import { useState } from 'react';
import { Eye, EyeOff, X, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { type Language } from '../../translations';

interface RegisterFormFieldsProps {
  form: Record<string, string>;
  fieldErrors: Record<string, string>;
  touched: Record<string, boolean>;
  strength: { score: number; label: string; color: string };
  onChange: (name: string, value: string) => void;
  onBlur: (name: string) => void;
  isPending: boolean;
  isLoading: boolean;
  stateError: string | null;
  serverError: string;
  t: Record<string, string>;
  formAction: (fd: FormData) => void;
}

export function RegisterFormFields({
  form, fieldErrors, touched, strength,
  onChange, onBlur,
  isPending, isLoading, stateError, serverError, t, formAction,
}: RegisterFormFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputClass = (name: string) =>
    `w-full px-4 py-4 rounded-xl border-2 outline-none transition-all bg-white text-lg font-medium min-h-[56px] ${
      touched[name] && fieldErrors[name]
        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/20'
        : 'border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20'
    }`;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <Label variant="auth">
          {t.nombreCompleto} <span className="text-red-500">*</span>
        </Label>
        <input type="text" value={form.full_name} onChange={(e) => onChange('full_name', e.target.value)}
          onBlur={() => onBlur('full_name')} className={inputClass('full_name')}
          placeholder="Dr. Juan Pérez" autoComplete="name" required />
        {touched.full_name && fieldErrors.full_name && (
          <p className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1">
            <X className="w-3 h-3" /> {fieldErrors.full_name}
          </p>
        )}
      </div>

      <div>
        <Label variant="auth">
          {t.email} <span className="text-red-500">*</span>
        </Label>
        <input type="email" value={form.email} onChange={(e) => onChange('email', e.target.value)}
          onBlur={() => onBlur('email')} className={inputClass('email')}
          placeholder="doctor@hospital.com" autoComplete="email" required />
        {touched.email && fieldErrors.email && (
          <p className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1">
            <X className="w-3 h-3" /> {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label variant="auth">{t.especialidad}</Label>
          <input type="text" value={form.specialty} onChange={(e) => onChange('specialty', e.target.value)}
            className="w-full px-4 py-4 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white text-lg font-medium min-h-[56px]"
            placeholder="Cardiología" />
        </div>
        <div>
          <Label variant="auth">{t.telefono}</Label>
          <input type="tel" value={form.phone} onChange={(e) => onChange('phone', e.target.value)}
            className="w-full px-4 py-4 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white text-lg font-medium min-h-[56px]"
            placeholder="+54 11 1234-5678" />
        </div>
      </div>

      <div>
        <Label variant="auth">{t.institucion}</Label>
        <input type="text" value={form.institution} onChange={(e) => onChange('institution', e.target.value)}
          className="w-full px-4 py-4 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white text-lg font-medium min-h-[56px]"
          placeholder="Hospital Italiano" />
      </div>

      <div>
        <Label variant="auth">{t.contrasena} <span className="text-red-500">*</span></Label>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} value={form.password}
            onChange={(e) => onChange('password', e.target.value)} onBlur={() => onBlur('password')}
            className={inputClass('password')} placeholder="••••••••" autoComplete="new-password" required />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {form.password.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="flex gap-1">
              {['length', 'upper', 'lower', 'digit', 'special'].map((rule) => {
                const checks: Record<string, boolean> = {
                  length: form.password.length >= 8,
                  upper: /[A-Z]/.test(form.password),
                  lower: /[a-z]/.test(form.password),
                  digit: /[0-9]/.test(form.password),
                  special: /[^A-Za-z0-9]/.test(form.password),
                };
                return (
                  <div key={rule} className={`h-1.5 flex-1 rounded-full ${checks[rule] ? strength.color : 'bg-slate-200'}`} />
                );
              })}
            </div>
            <p className={`text-xs font-medium ${strength.label === t.passwordFuerte ? 'text-green-600' : 'text-slate-400'}`}>
              {strength.label === t.passwordFuerte ? t.contrasenaSegura : t.requisitosLabel + ' ' + [
                form.password.length < 8 && t.requisito8chars,
                !/[A-Z]/.test(form.password) && t.requisitoMayuscula,
                !/[a-z]/.test(form.password) && t.requisitoMinuscula,
                !/[0-9]/.test(form.password) && t.requisitoNumero,
              ].filter(Boolean).join(', ')}
            </p>
          </div>
        )}
        {touched.password && fieldErrors.password && (
          <p className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1">
            <X className="w-3 h-3" /> {fieldErrors.password}
          </p>
        )}
      </div>

      <div>
        <Label variant="auth">{t.confirmarContrasena} <span className="text-red-500">*</span></Label>
        <div className="relative">
          <input type={showConfirmPassword ? 'text' : 'password'} value={form.password_confirm}
            onChange={(e) => onChange('password_confirm', e.target.value)} onBlur={() => onBlur('password_confirm')}
            className={inputClass('password_confirm')} placeholder="••••••••" autoComplete="new-password" required />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {touched.password_confirm && fieldErrors.password_confirm && (
          <p className="text-red-500 text-xs mt-1 font-medium flex items-center gap-1">
            <X className="w-3 h-3" /> {fieldErrors.password_confirm}
          </p>
        )}
      </div>

      {(stateError || serverError) && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
          {stateError || serverError}
        </div>
      )}

      <Button type="submit" disabled={isPending || isLoading} className="w-full py-4 text-lg">
        {isPending || isLoading ? t.cargando : t.crearCuenta}
      </Button>
    </form>
  );
}
