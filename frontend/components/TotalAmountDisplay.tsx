import { Label } from './ui/Label';
import { formatMoneyInput } from '../lib/utils';

interface TotalAmountDisplayProps {
  amount: string;
  onChange?: (value: string) => void;
}

export function TotalAmountDisplay({ amount, onChange }: TotalAmountDisplayProps) {
  return (
    <div className="space-y-2">
      <Label variant="business">Monto Total ($)</Label>
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border-2 border-blue-100 dark:border-blue-800">
        <div className="flex items-center justify-center gap-1">
          <span className="text-2xl lg:text-3xl font-black text-blue-600">$</span>
          <input type="text" inputMode="numeric" name="amount_display" value={amount}
            readOnly={!onChange}
            onChange={(e) => onChange?.(formatMoneyInput(e.target.value))}
            className="bg-transparent text-3xl lg:text-4xl font-black text-slate-900 dark:text-white w-full text-center outline-none"
            placeholder="0" />
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">Pesos Argentinos</p>
      </div>
    </div>
  );
}
