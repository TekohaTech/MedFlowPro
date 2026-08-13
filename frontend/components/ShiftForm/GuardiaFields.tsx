import { Input } from '../ui/Input';
import { TotalAmountDisplay } from '../TotalAmountDisplay';
import { DateTimeInputs } from '../DateTimeInputs';
import { RateInfo } from './RateInfo';
import { ExtraActivitiesList } from './ExtraActivitiesList';
import { formatMoneyInput } from '../../lib/utils';
import { translations, type Language } from '../../translations';
import type { Institution } from '../../types';
import type { RateBreakdownSegment, ExtraActivity } from './useShiftForm';

interface GuardiaFieldsProps {
  /** Guardia-mode form values. */
  amount: string;
  hours: string;
  hourlyRate: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  /** Range error from the amount-preview effect (shown below the time inputs). */
  previewError: string | null;
  onAmountChange: (v: string) => void;
  onHoursChange: (v: string) => void;
  onHourlyRateChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onStartTimeChange: (v: string) => void;
  onEndTimeChange: (v: string) => void;
  /** Selected institution: drives the flat-rate notice, breakdown and extra prefill rates. */
  selectedInstitution: Institution | undefined;
  /** Rate-info state derived by useShiftForm (notice and breakdown are mutually exclusive). */
  institutionHasNoRates: boolean;
  rateBreakdown: RateBreakdownSegment[] | null;
  /** UI language for the RateInfo labels. */
  language: Language;
  /** Same-day extras (procedimientos/interconsultas) editor. */
  extras: ExtraActivity[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<ExtraActivity>) => void;
  onRemove: (id: string) => void;
  extraTotal: number;
  guardiaDate: string;
}

/**
 * Purely presentational: the guardia-mode field stack of ShiftForm (amount
 * display, hours/$/Hora grid, rate info, datetime inputs, range error and the
 * extras editor). Extracted so ShiftForm.tsx stays within the 200-line limit.
 */
export function GuardiaFields({
  amount, hours, hourlyRate, date, endDate, startTime, endTime, previewError,
  onAmountChange, onHoursChange, onHourlyRateChange,
  onDateChange, onEndDateChange, onStartTimeChange, onEndTimeChange,
  selectedInstitution, institutionHasNoRates, rateBreakdown, language,
  extras, onAdd, onUpdate, onRemove, extraTotal, guardiaDate,
}: GuardiaFieldsProps) {
  const t = translations[language];
  return (
    <>
      <TotalAmountDisplay amount={amount} onChange={onAmountChange} />

      <div className="grid grid-cols-2 gap-3">
        <Input label={t.horas} type="text" inputMode="numeric" name="hours" value={hours}
          onChange={(e) => onHoursChange(e.target.value.replace(/\D/g, ''))}
          placeholder={t.ejemploHoras} />
        <Input label={t.dolarHora} type="text" inputMode="numeric" name="hourly_rate" value={hourlyRate}
          onChange={(e) => onHourlyRateChange(formatMoneyInput(e.target.value))}
          placeholder={t.ejemploTasaHora} />
      </div>

      <RateInfo
        institutionHasNoRates={institutionHasNoRates}
        rateBreakdown={rateBreakdown}
        language={language}
      />

      <DateTimeInputs
        date={date} endDate={endDate} startTime={startTime} endTime={endTime}
        onDateChange={onDateChange} onEndDateChange={onEndDateChange}
        onStartTimeChange={onStartTimeChange} onEndTimeChange={onEndTimeChange}
      />

      {previewError && (
        <p className="text-[10px] font-bold text-red-600 dark:text-red-400">{previewError}</p>
      )}

      <ExtraActivitiesList extras={extras} onAdd={onAdd} onUpdate={onUpdate} onRemove={onRemove}
        extraTotal={extraTotal} procedimientoRate={selectedInstitution?.procedimiento_rate || 0}
        interconsultaRate={selectedInstitution?.interconsulta_rate || 0} guardiaDate={guardiaDate} />
    </>
  );
}
