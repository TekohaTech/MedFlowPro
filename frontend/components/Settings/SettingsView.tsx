import { useState } from 'react';
import { UserProfile, UserSettings } from '../../types';
import { User, Globe, Moon, Sun, ChevronRight, Check, Bell, KeyRound } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AVATARS, avatarUrl } from '../../lib/avatars';
import { translations } from '../../translations';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PasswordModal } from './PasswordModal';
import { NotificationsList } from './NotificationsList';

interface SettingsViewProps {
  profile: UserProfile;
  settings: UserSettings;
  isAdmin?: boolean;
  onUpdateProfile: (profile: Partial<UserProfile>) => void;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
}

export function SettingsView({
  profile,
  settings,
  isAdmin = false,
  onUpdateProfile,
  onUpdateSettings,
}: SettingsViewProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const t = translations[settings.language];

  return (
    <div className="p-4 lg:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <header className="space-y-1">
        <h1 className={cn("text-3xl font-black tracking-tight leading-none", settings.darkMode ? "text-white" : "text-slate-900")}>{t.ajustes}</h1>
        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[9px] opacity-60 leading-none">{t.preferencias}</p>
      </header>

      {!isAdmin && (<>
      {/* Avatar Selection */}
      <Card className="p-6 lg:p-8 shadow-xl shadow-slate-100/30 dark:shadow-none" padding="none">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className={cn("text-lg font-black tracking-tight", settings.darkMode ? "text-white" : "text-slate-900")}>{t.perfilAvatar}</h2>
        </div>

        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10">
          <div className="flex flex-col items-center gap-4 shrink-0">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
              <img 
                src={avatarUrl(profile.avatar)} 
                className="w-40 h-40 rounded-[2.5rem] border-4 border-white dark:border-slate-700 shadow-2xl object-cover bg-slate-50 dark:bg-slate-900 relative z-10 transition-transform duration-500 group-hover:scale-105" 
                alt="Avatar" 
              />
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2.5 rounded-2xl shadow-lg z-20 border-2 border-white dark:border-slate-800">
                <Check className="w-4 h-4" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              {(Object.keys(AVATARS) as UserProfile['avatar'][]).map((type) => (
                <button
                  key={type}
                  onClick={() => onUpdateProfile({ avatar: type })}
                  className={cn(
                    "w-14 h-14 rounded-2xl border-2 transition-all p-1 shadow-sm",
                    profile.avatar === type 
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 scale-110" 
                      : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={avatarUrl(type)} alt={type} className="w-full h-full object-cover rounded-xl" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label variant="setting">{t.nombreCompleto}</Label>
                <p className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-black tracking-tight">
                  {profile.name}
                </p>
              </div>
              <div className="space-y-2">
                <Label variant="setting">{t.especialidad}</Label>
                <p className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl px-5 py-4 text-slate-900 dark:text-white font-black tracking-tight">
                  {profile.specialty}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-200">Cambiar contraseña</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
            </button>
            
          </div>
        </div>
      </Card>

      </>)}

      {/* Preferences */}
      <Card padding="xl" className="shadow-xl shadow-slate-100/40 dark:shadow-none">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-5 h-5 text-indigo-600" />
          <h2 className={cn("text-lg font-bold", settings.darkMode ? "text-white" : "text-slate-900")}>{t.preferencias}</h2>
        </div>

        <div className="space-y-4">
          <SettingItem 
            icon={<Globe className="w-5 h-5" />} 
            label={t.idioma} 
            value={settings.language === 'es' ? 'Español' : 'English'} 
            onClick={() => onUpdateSettings({ language: settings.language === 'es' ? 'en' : 'es' })}
          />
          <SettingItem 
            icon={settings.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />} 
            label={t.modoOscuro} 
            value={settings.darkMode ? t.activado : t.desactivado} 
            onClick={() => onUpdateSettings({ darkMode: !settings.darkMode })}
          />
          <SettingItem 
            icon={<Bell className="w-5 h-5" />} 
            label={t.notificaciones} 
            value="" 
            onClick={() => setShowNotifications(!showNotifications)}
          />
        </div>
        {showNotifications && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <NotificationsList language={settings.language} />
          </div>
        )}
      </Card>

      <div className="text-center pt-4">
        <p className="text-slate-400 text-xs font-medium">MedFlow Pro v1.0.5 • © 2026</p>
      </div>

      <PasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} language={settings.language} />
    </div>
  );
};

const SettingItem = ({ icon, label, value, onClick, disabled = false }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button 
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
      disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-slate-900 group"
    )}
  >
    <div className="flex items-center gap-4 min-w-0 flex-1">
      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:text-blue-600 transition-colors shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{label}</div>
        {value && (
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">{value}</div>
        )}
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 ml-2" />
  </button>
);
