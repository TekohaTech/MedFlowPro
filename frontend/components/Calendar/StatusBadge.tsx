import { PaymentStatus } from '../../types';
import { cn } from '../../lib/utils';

interface StatusBadgeProps {
  status: PaymentStatus;
  t: Record<string, string>;
}

// Vista rápida de cobro: badge con color propio, sin depender solo del monto.
export function StatusBadge({ status, t }: StatusBadgeProps) {
  return (
    <span className={cn(
      "text-[6px] lg:text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded shrink-0",
      status === PaymentStatus.PAID
        ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
        : "bg-orange-100 dark:bg-orange-900/40 text-orange-500 dark:text-orange-400"
    )}>
      {status === PaymentStatus.PAID ? t.pagadoBadge : t.pendienteBadge}
    </span>
  );
}
