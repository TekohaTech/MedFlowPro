import { cn } from '../lib/utils';
import { Clock, Check } from 'lucide-react';
import { PaymentStatus } from '../types';
import { Label } from './ui/Label';
import { translations, type Language } from '../translations';

interface PaymentStatusToggleProps {
  status: PaymentStatus;
  onChange: () => void;
  language: Language;
}

export function PaymentStatusToggle({ status, onChange, language }: PaymentStatusToggleProps) {
  const t = translations[language];
  return (
    <div className="space-y-2">
      <Label variant="business">{t.estadoPago}</Label>
      <div
        onClick={onChange}
          className={cn(
            "relative w-full lg:max-w-xs lg:mx-auto p-0.5 rounded-xl cursor-pointer transition-all duration-300 flex border min-h-[44px]",
          status === PaymentStatus.PENDING
            ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
            : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        )}
      >
        <div className={cn(
          "flex-1 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-300",
          status === PaymentStatus.PENDING
            ? "bg-orange-500 text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/30 scale-[1.02] z-10"
            : "text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30"
        )}>
          <Clock className={status === PaymentStatus.PENDING ? "w-4 h-4" : "w-4 h-4 opacity-50"} />
          {t.pendiente}
        </div>
        <div className={cn(
          "flex-1 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all duration-300",
          status === PaymentStatus.PAID
            ? "bg-green-600 text-white shadow-lg shadow-green-200 dark:shadow-green-900/30 scale-[1.02] z-10"
            : "text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30"
        )}>
          <Check className={status === PaymentStatus.PAID ? "w-4 h-4" : "w-4 h-4 opacity-50"} />
          {t.pagado}
        </div>
      </div>
      <p className="text-[9px] text-slate-400 flex items-center gap-1">
        {String.fromCharCode(0x1F4A1)} {status === PaymentStatus.PENDING
          ? t.marcadoPendiente
          : t.marcadoPagado}
      </p>
    </div>
  );
}
