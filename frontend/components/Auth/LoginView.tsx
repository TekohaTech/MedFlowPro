import { useActionState, useState } from 'react';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { translations, Language } from '../../translations';
import { supportMailto } from '../../lib/support';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';

interface LoginViewProps {
  onLogin: (email: string, password: string) => Promise<void>;
  loginError: string;
  isLoading: boolean;
  settings: { language: Language; darkMode: boolean; currency: string };
  onNavigateToRegister?: () => void;
}

interface LoginFormState {
  error: string | null;
}

export function LoginView({ onLogin, loginError, isLoading, settings, onNavigateToRegister }: LoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);
  const t = translations[settings.language];

  const [state, formAction, isPending] = useActionState(
    async (prev: LoginFormState, formData: FormData) => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      try {
        await onLogin(email, password);
        return { error: null };
      } catch {
        return { error: 'Error al iniciar sesión. Verificá tus credenciales.' };
      }
    },
    { error: null },
  );

  const busy = isPending || isLoading;

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
          <h1 className="text-2xl font-bold mb-2 text-center text-slate-800">
            {t.bienvenido}
          </h1>
          <p className="text-slate-600 text-center mb-8">{t.iniciarSesion}</p>
          
          <form action={formAction} className="space-y-5">
            <div>
              <Label variant="auth" htmlFor="login-email">{t.email || "Email"}</Label>
              <input
                type="email"
                name="email"
                id="login-email"
                defaultValue=""
                className="w-full px-4 py-4 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white text-lg min-h-[56px]"
                placeholder="doctor@hospital.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <Label variant="auth" htmlFor="login-password">{t.contrasena || "Contraseña"}</Label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="login-password"
                  defaultValue=""
                  className="w-full px-4 py-4 pr-12 rounded-xl border-2 border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-white text-lg min-h-[56px]"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {(state.error || loginError) && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                {state.error || loginError}
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full py-4 text-lg">
              {busy ? t.cargando : 'Iniciar Sesión'}
            </Button>
          </form>

          <p className="text-center text-slate-400 text-sm mt-6">
            {t.noTienesCuenta}{' '}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-blue-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
            >
              {t.registrate}
            </button>
          </p>

          <a
            href={supportMailto()}
            className="flex items-center justify-center gap-1.5 text-slate-400 hover:text-blue-600 text-sm font-medium py-2.5 transition-colors mt-1"
          >
            <span>{t.ayuda}</span>
            <span className="underline">{t.contacto}</span>
          </a>
        </div>
      </div>
    </div>
  );
}