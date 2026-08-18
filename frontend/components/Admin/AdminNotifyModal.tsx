import { X, Send, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { translations, Language } from '../../translations';
import { useAdminNotify } from '../../hooks/useAdminNotify';

interface UserOption {
  id: string;
  full_name: string;
  email: string;
}

interface AdminNotifyModalProps {
  show: boolean;
  onClose: () => void;
  users: UserOption[];
  currentFilter: string;
  language: Language;
}

export function AdminNotifyModal({
  show,
  onClose,
  users,
  currentFilter,
  language,
}: AdminNotifyModalProps) {
  const t = translations[language];
  const {
    targetMode, setTargetMode,
    selectedUserId, setSelectedUserId,
    type, setType,
    title, setTitle,
    message, setMessage,
    error, isPending,
    handleSubmit,
  } = useAdminNotify({ language, onClose });

  if (!show) return null;

  const typeLabels: Record<string, string> = {
    info: t.notifInfo,
    warning: t.notifWarning,
    alert: t.notifAlert,
  };

  const filterLabel = currentFilter === 'all' ? 'todos' : currentFilter;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-900">{t.notifSend}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Destination selector */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.notifSendTo}</label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={targetMode === 'all' ? 'primary' : 'secondary'}
                onClick={() => setTargetMode('all')}>
                {t.notifAllUsers}
              </Button>
              <Button size="sm" variant={targetMode === 'filter' ? 'primary' : 'secondary'}
                onClick={() => setTargetMode('filter')}>
                {t.notifCurrentFilter} ({filterLabel})
              </Button>
              <Button size="sm" variant={targetMode === 'specific' ? 'primary' : 'secondary'}
                onClick={() => setTargetMode('specific')}>
                {t.notifSpecificUser}
              </Button>
            </div>
            {targetMode === 'specific' && (
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none"
              >
                <option value="">{t.notifSelectUser}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} — {u.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Type selector */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.notifType}</label>
            <div className="flex gap-2">
              {(['info', 'warning', 'alert'] as const).map(tp => (
                <button
                  key={tp}
                  onClick={() => setType(tp)}
                  className={cn(
                    'px-4 py-2 rounded-xl font-bold text-sm transition-all',
                    type === tp
                      ? tp === 'info' ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                        : tp === 'warning' ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500'
                        : 'bg-red-100 text-red-700 ring-2 ring-red-500'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100',
                  )}
                >
                  {typeLabels[tp]}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.notifTitleField}</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Nueva versión disponible"
              maxLength={200}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t.notifMessageField}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t.escribirMensaje}
              maxLength={2000}
              rows={4}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none resize-none"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 pt-0">
          <Button variant="secondary" onClick={onClose}>
            {t.cancelar}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t.notifSending}</>
            ) : (
              <><Send className="w-4 h-4" /> {t.notifSendBtn}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
