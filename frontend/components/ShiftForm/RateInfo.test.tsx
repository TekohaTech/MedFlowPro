// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RateInfo } from './RateInfo';
import type { RateBreakdownSegment } from './useShiftForm';

function render(overrides: Partial<Parameters<typeof RateInfo>[0]>): string {
  return renderToStaticMarkup(
    <RateInfo institutionHasNoRates={false} rateBreakdown={null} language="es" {...overrides} />,
  );
}

const mixedSegments: RateBreakdownSegment[] = [
  { hours: 24, rate: 5000, labelKey: 'diaSemana' },
  { hours: 24, rate: 9000, labelKey: 'diaFeriado' },
  { hours: 24, rate: 8000, labelKey: 'diaFinde' },
];

describe('RateInfo — flat-rate notice', () => {
  it('renders the notice (es) when the institution has no configured rates', () => {
    const html = render({ institutionHasNoRates: true });
    expect(html).toContain('Esta institución no tiene tarifas configuradas.');
    expect(html).not.toContain('(semana)');
  });

  it('renders the translated notice (en)', () => {
    const html = render({ institutionHasNoRates: true, language: 'en' });
    expect(html).toContain('This institution has no configured rates.');
  });
});

describe('RateInfo — day-type breakdown', () => {
  it('renders the mixed line with es-AR formatting and translated labels', () => {
    const html = render({ rateBreakdown: mixedSegments });
    expect(html).toContain('24h × $5.000 (semana)');
    expect(html).toContain('24h × $9.000 (feriado)');
    expect(html).toContain('24h × $8.000 (fin de semana)');
  });

  it('renders the mixed line with English labels', () => {
    const html = render({ rateBreakdown: mixedSegments, language: 'en' });
    expect(html).toContain('24h × $5.000 (weekday)');
    expect(html).toContain('24h × $9.000 (holiday)');
    expect(html).toContain('24h × $8.000 (weekend)');
  });

  it('renders the weekend segment when the finde rate comes from the legacy fallback (finde == semana)', () => {
    // Legacy institution: guardia_rate=5000, guardia_feriado_rate=9000, no
    // guardia_finde_rate. The breakdown now emits diaFinde at the weekday
    // rate, so the rendered line must include the (fin de semana) segment.
    const html = render({
      rateBreakdown: [
        { hours: 24, rate: 5000, labelKey: 'diaSemana' },
        { hours: 24, rate: 5000, labelKey: 'diaFinde' },
        { hours: 24, rate: 9000, labelKey: 'diaFeriado' },
      ],
    });
    expect(html).toContain('24h × $5.000 (semana)');
    expect(html).toContain('24h × $5.000 (fin de semana)');
    expect(html).toContain('24h × $9.000 (feriado)');
  });
});

describe('RateInfo — renders nothing', () => {
  it('renders nothing when the breakdown is null (single day type)', () => {
    expect(render({})).toBe('');
  });

  it('renders nothing for a single-segment breakdown', () => {
    expect(render({ rateBreakdown: [{ hours: 24, rate: 5000, labelKey: 'diaSemana' }] })).toBe('');
  });

  it('notice wins over a non-null breakdown (states are mutually exclusive)', () => {
    const html = render({ institutionHasNoRates: true, rateBreakdown: mixedSegments });
    expect(html).toContain('Esta institución no tiene tarifas configuradas.');
    expect(html).not.toContain('(semana)');
  });
});
