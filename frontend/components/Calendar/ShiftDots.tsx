import { ShiftType, Transaction } from '../../types';
import { cn } from '../../lib/utils';

// Type-based dot colors (existing behavior, used when an institution has no
// stored/assigned color — extras ALWAYS keep this treatment).
export function dotTypeClass(type: ShiftType): string {
  switch (type) {
    case ShiftType.EXTRA: return 'bg-amber-500';
    case ShiftType.CONSULTATION: return 'bg-purple-500';
    case ShiftType.PASSIVE: return 'bg-green-500';
    default: return 'bg-blue-500';
  }
}

export function dotTypeBorderClass(type: ShiftType): string {
  switch (type) {
    case ShiftType.EXTRA: return 'border-amber-500';
    case ShiftType.CONSULTATION: return 'border-purple-500';
    case ShiftType.PASSIVE: return 'border-green-500';
    default: return 'border-blue-500';
  }
}

// Institution hex color for a transaction's dot. Extras keep their type
// treatment; everything else uses the institution color when known.
export function resolveDotColor(tx: Transaction, colorMap: Map<string, string>): string | null {
  if (tx.type === ShiftType.EXTRA) return null;
  return colorMap.get(tx.institution) ?? null;
}

interface ShiftDotProps {
  tx: Transaction;
  colorMap: Map<string, string>;
  /** Coverage state: outline (ring) dot without fill. */
  ring?: boolean;
  size?: 'sm' | 'xs';
}

export function ShiftDot({ tx, colorMap, ring = false, size = 'sm' }: ShiftDotProps) {
  const hex = resolveDotColor(tx, colorMap);
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-1.5 h-1.5';

  if (hex) {
    return (
      <span
        className={cn('rounded-full shrink-0', sizeClass, ring && 'border')}
        style={ring ? { borderColor: hex } : { backgroundColor: hex }}
      />
    );
  }
  return (
    <span
      className={cn(
        'rounded-full shrink-0',
        sizeClass,
        ring ? cn('border-2', dotTypeBorderClass(tx.type)) : dotTypeClass(tx.type),
      )}
    />
  );
}
