import { translations, type Language } from '../../translations';
import type { RateBreakdownSegment } from './useShiftForm';

interface RateInfoProps {
  /** True when the institution exists but has none of its rates configured. */
  institutionHasNoRates: boolean;
  /** Day-type segments when the guardia crosses 2+ day types; null otherwise. */
  rateBreakdown: RateBreakdownSegment[] | null;
  /** UI language (drives the translated notice and day-type labels). */
  language: Language;
}

/**
 * Purely presentational: renders either the flat-rate notice (institution with
 * no configured rates) OR a day-type breakdown line (guardia crossing weekday /
 * weekend / holiday). The two states are mutually exclusive — the hook already
 * returns rateBreakdown: null when institutionHasNoRates is true.
 */
export function RateInfo({ institutionHasNoRates, rateBreakdown, language }: RateInfoProps) {
  const t = translations[language];

  if (institutionHasNoRates) {
    return (
      <div className="rounded-lg bg-slate-100/80 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50 px-2.5 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-snug">
        {t.noTarifasConfiguradas}
      </div>
    );
  }

  if (!rateBreakdown || rateBreakdown.length < 2) return null;

  const parts = rateBreakdown.map(seg =>
    `${seg.hours}h × $${seg.rate.toLocaleString('es-AR')} (${t[seg.labelKey]})`,
  );

  return (
    <div className="rounded-lg bg-slate-100/80 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-600/50 px-2.5 py-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-snug">
      <span className="text-slate-400 dark:text-slate-500 text-[10px]">{t.desgloseGuardia}</span>
      <div className="flex items-baseline gap-x-1.5 mt-0.5">
        {parts.map((part, i) => (
          <span key={i} className={i > 0 ? 'text-slate-400 dark:text-slate-500' : undefined}>
            {i > 0 && <span className="mx-1">+</span>}
            {part}
          </span>
        ))}
      </div>
    </div>
  );
}
