import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { translations, type Language } from '../translations';

type TargetMode = 'specific' | 'all' | 'filter';
type NotificationType = 'info' | 'warning' | 'alert';

interface UseAdminNotifyOptions {
  language: Language;
  onClose: () => void;
}

export function useAdminNotify({ language, onClose }: UseAdminNotifyOptions) {
  const t = translations[language];

  const [targetMode, setTargetMode] = useState<TargetMode>('all');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [type, setType] = useState<NotificationType>('info');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const reset = useCallback(() => {
    setTitle('');
    setMessage('');
    setType('info');
    setTargetMode('all');
    setSelectedUserId('');
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !message.trim()) {
      setError(t.completarCampos);
      return;
    }
    setError(null);
    setIsPending(true);

    try {
      await api.createNotification({
        target_user_id: targetMode === 'specific' ? selectedUserId : null,
        target_all: targetMode === 'all',
        type,
        title: title.trim(),
        message: message.trim(),
      });
      onClose();
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errorEnviar);
    } finally {
      setIsPending(false);
    }
  }, [targetMode, selectedUserId, type, title, message, t, onClose, reset]);

  return {
    targetMode,
    setTargetMode,
    selectedUserId,
    setSelectedUserId,
    type,
    setType,
    title,
    setTitle,
    message,
    setMessage,
    error,
    isPending,
    handleSubmit,
    reset,
  };
}
