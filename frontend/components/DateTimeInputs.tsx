import { Input } from './ui/Input';
import { translations, type Language } from '../translations';

interface DateTimeInputsProps {
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  onDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onStartTimeChange: (v: string) => void;
  onEndTimeChange: (v: string) => void;
  language: Language;
}

export function DateTimeInputs({
  date, endDate, startTime, endTime,
  onDateChange, onEndDateChange, onStartTimeChange, onEndTimeChange,
  language,
}: DateTimeInputsProps) {
  const t = translations[language];
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t.fechaInicio} type="date" value={date}
          onChange={(e) => onDateChange(e.target.value)}
        />
        <Input
          label={t.fechaFin} type="date" value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t.horaInicio} type="time" value={startTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
        />
        <Input
          label={t.horaFin} type="time" value={endTime}
          onChange={(e) => onEndTimeChange(e.target.value)}
        />
      </div>
    </>
  );
}
