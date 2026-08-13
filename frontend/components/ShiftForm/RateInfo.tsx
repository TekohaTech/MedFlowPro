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
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-snug">
        {t.noTarifasConfiguradas}
      </p>
    );
  }

  if (!rateBreakdown || rateBreakdown.length < 2) return null;

  const parts = rateBreakdown.map(seg =>
    `${seg.hours}h × $${seg.rate.toLocaleString('es-AR')} (${t[seg.labelKey]})`,
  );

  return (
    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-snug">
      {parts.join(' + ')}
    </p>
  );
}
