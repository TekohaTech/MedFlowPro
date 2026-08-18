import { useActionState, useState } from 'react';
import { Sparkles, Check, ArrowLeft } from 'lucide-react';
import { translations, type Language } from '../../translations';
import { Button } from '../ui/Button';
import { RegisterFormFields } from './RegisterFormFields';
interface RegisterViewProps {
  onRegister: (data: {
    email: string;
    password: string;
    password_confirm: string;
    full_name: string;
    specialty?: string;
    institution?: string;
    phone?: string;
  }) => Promise<void>;
  onBackToLogin: () => void;
  error: string;
  isLoading: boolean;
  settings: { language: Language; darkMode: boolean; currency: string };
  successMessage?: string;
}

type FieldErrors = {
  email?: string;
  full_name?: string;
  password?: string;
  password_confirm?: string;
};

interface RegisterFormState {
  error: string | null;
  success: boolean;
}

export function RegisterView({ onRegister, onBackToLogin, error, isLoading, settings, successMessage }: RegisterViewProps) {
  const [form, setForm] = useState({
    email: '', full_name: '', specialty: '', institution: '', phone: '', password: '', password_confirm: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const t = translations[settings.language];
  const [state, formAction, isPending] = useActionState(
    async (prev: RegisterFormState, formData: FormData) => {
      const data = {
        email: formData.get('email') as string,
        full_name: formData.get('full_name') as string,
        specialty: formData.get('specialty') as string,
        institution: formData.get('institution') as string,
        phone: formData.get('phone') as string,
        password: formData.get('password') as string,
        password_confirm: formData.get('password_confirm') as string,
      };
      if (data.full_name.length < 2) return { error: t.nombreRequerido, success: false };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: t.emailInvalido, success: false };
      if (data.password.length < 8) return { error: t.contrasenaDebil, success: false };
      if (data.password !== data.password_confirm) return { error: t.contrasenasNoCoinciden, success: false };
      try {
        await onRegister(data);
        return { error: null, success: true };
      } catch {
        return { error: t.errorCrearCuenta, success: false };
      }
    },
    { error: null, success: false },
  );
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'email':
        if (!value) return undefined;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? undefined : t.emailInvalido;
      case 'full_name':
        if (!value) return undefined;
        return value.length >= 2 ? undefined : t.nombreRequerido;
      case 'password':
        if (!value) return undefined;
        if (value.length < 8) return t.requisitoLongitud;
        if (!/[A-Z]/.test(value)) return t.requisitoMayuscula;
        if (!/[a-z]/.test(value)) return t.requisitoMinuscula;
        if (!/[0-9]/.test(value)) return t.requisitoNumero;
        return undefined;
      case 'password_confirm':
        if (!value) return undefined;
        return value === form.password ? undefined : t.contrasenasNoCoinciden;
      default:
        return undefined;
    }
  };
  const handleChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    }
    if ((name === 'password' || name === 'password_confirm') && touched.password_confirm) {
      const match = name === 'password_confirm' ? value === form.password : value === form.password_confirm;
      setFieldErrors(prev => ({ ...prev, password_confirm: form.password_confirm ? (match ? undefined : t.contrasenasNoCoinciden) : undefined }));
    }
  };
  const handleBlur = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    setFieldErrors(prev => ({ ...prev, [name]: validateField(name, form[name as keyof typeof form]) }));
  };
  const passwordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { score, label: t.passwordDebil, color: 'bg-red-500' };
    if (score <= 3) return { score, label: t.passwordMedia, color: 'bg-yellow-500' };
    return { score, label: t.passwordFuerte, color: 'bg-green-500' };
  };
  const strength = passwordStrength(form.password);
  return (
    <div className="min-h-screen relative flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/login-bg.webp)' }}
      />
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center gap-3 mb-10 px-2 justify-center">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3">
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <span className="font-black text-2xl tracking-tighter block leading-none text-white">
              MedFlow
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">
              Pro Edition
            </span>
          </div>
        </div>
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
          {(successMessage || state.success) ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">{t.registroExitoso}</h2>
              <p className="text-slate-600 mb-6">{t.cuentaCreada}</p>
              <Button onClick={onBackToLogin} className="mx-auto">
                <ArrowLeft className="w-4 h-4" />
                {t.iniciarSesionBtn}
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2 text-center text-slate-800">
                {t.crearCuenta}
              </h1>
              <p className="text-slate-600 text-center mb-8">{t.registrate}</p>
              <RegisterFormFields
                form={form}
                fieldErrors={fieldErrors}
                touched={touched}
                strength={strength}
                onChange={handleChange}
                onBlur={handleBlur}
                isPending={isPending}
                isLoading={isLoading}
                stateError={state.error}
                serverError={error}
                t={t}
                formAction={formAction}
              />
              <p className="text-center text-slate-400 text-sm mt-6">
                {t.yaTienesCuenta}{' '}
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="text-blue-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  {t.iniciarSesionBtn}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
