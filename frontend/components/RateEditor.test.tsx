// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { RateEditor, parseRateInput, shouldSkipRateSave } from './RateEditor';
import { Institution } from '../types';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    updateInstitution: vi.fn(),
    recalculatePending: vi.fn(),
  },
}));

function makeInstitution(overrides: Partial<Institution> = {}): Institution {
  return {
    id: 'i1',
    name: 'Hospital Test',
    guardia_rate: null,
    guardia_semana_rate: 5000,
    guardia_finde_rate: 7000,
    guardia_feriado_rate: null,
    procedimiento_rate: null,
    interconsulta_rate: null,
    is_active: true,
    ...overrides,
  };
}

function renderEditor(institution: Institution): string {
  return renderToStaticMarkup(
    <RateEditor institution={institution} onInstitutionChange={() => {}} />,
  );
}

describe('parseRateInput — es-AR decimal rules', () => {
  it('returns null for empty/whitespace input', () => {
    expect(parseRateInput('')).toBeNull();
    expect(parseRateInput('   ')).toBeNull();
  });

  it('parses plain integers', () => {
    expect(parseRateInput('12000')).toBe(12000);
    expect(parseRateInput('0')).toBe(0);
  });

  it('parses es-AR thousands separators (dot)', () => {
    expect(parseRateInput('12.000')).toBe(12000);
    expect(parseRateInput('$ 9.000')).toBe(9000);
    expect(parseRateInput('8.000')).toBe(8000);
  });

  it('parses es-AR decimal separator (comma)', () => {
    expect(parseRateInput('1250,50')).toBe(1250.5);
    expect(parseRateInput('1.250,50')).toBe(1250.5);
  });

  it('never produces NaN — junk/letters input resolves to null', () => {
    expect(parseRateInput('abc')).toBeNull();
    expect(parseRateInput('1250abc')).toBe(1250);
    expect(parseRateInput(',')).toBeNull();
    expect(parseRateInput('.')).toBeNull();
  });
});

describe('shouldSkipRateSave — API-call guard', () => {
  it('skips the API call when nothing changed (empty input on an unset rate)', () => {
    expect(shouldSkipRateSave(null, null)).toBe(true);
    expect(shouldSkipRateSave(null, undefined)).toBe(true);
  });

  it('skips when the input parses to the SAME value as the current rate (no-op edit)', () => {
    expect(shouldSkipRateSave(20000, 20000)).toBe(true);
    expect(shouldSkipRateSave(1250.5, 1250.5)).toBe(true);
    expect(shouldSkipRateSave(0, 0)).toBe(true);
  });

  it('does NOT skip when the input clears an existing rate (explicit clear)', () => {
    expect(shouldSkipRateSave(null, 9000)).toBe(false);
  });

  it('does NOT skip when a value (including 0) is entered', () => {
    expect(shouldSkipRateSave(5000, null)).toBe(false);
    expect(shouldSkipRateSave(0, null)).toBe(false);
    expect(shouldSkipRateSave(0, 5000)).toBe(false);
  });
});

/** Extracts the "Gdia feriado" row HTML (scoped by its title tooltip). */
function feriadoRow(html: string): string {
  const marker = 'title="Valor por hora de guardia en feriado nacional"';
  const idx = html.indexOf(marker);
  return idx === -1 ? '' : html.slice(idx, idx + 200);
}

describe('RateEditor rate display', () => {
  it('renders a configured 0 as $0/h, not "—"', () => {
    const html = renderEditor(makeInstitution({ guardia_feriado_rate: 0 }));
    expect(feriadoRow(html)).toContain('$\u00A00/h');
    expect(feriadoRow(html)).not.toContain('—');
  });

  it('renders "—" for a null rate', () => {
    const html = renderEditor(makeInstitution({ guardia_feriado_rate: null }));
    expect(feriadoRow(html)).toContain('—');
    expect(feriadoRow(html)).not.toContain('$');
  });

  it('renders a large value without truncation issues (5-digit rates)', () => {
    const html = renderEditor(makeInstitution({ guardia_feriado_rate: 12000 }));
    expect(feriadoRow(html)).toContain('$\u00A012.000/h');
  });

  it('renders decimal rates with 2 decimals (es-AR)', () => {
    const html = renderEditor(makeInstitution({ guardia_feriado_rate: 1250.5 }));
    expect(feriadoRow(html)).toContain('$\u00A01.250,50/h');
  });
});

describe('RateEditor save error visibility', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.resetAllMocks();
  });

  it('shows a visible error when the rate save fails (no silent catch)', async () => {
    vi.mocked(api.updateInstitution).mockRejectedValueOnce(new Error('network down'));

    await act(async () => {
      root.render(<RateEditor institution={makeInstitution()} onInstitutionChange={() => {}} />);
    });

    // Enter edit mode for the feriado row via its pencil
    const feriadoLabel = container.querySelector('span[title="Valor por hora de guardia en feriado nacional"]');
    expect(feriadoLabel).not.toBeNull();
    const pencil = feriadoLabel!.querySelector('button[title="Editar"]') as HTMLButtonElement;
    act(() => { pencil.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    // Type a decimal value into the edit input
    const input = container.querySelector('input[placeholder="Ingresá valor"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(input, '1250,50');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Confirm with the green check button
    const checkBtn = container.querySelector('button[class*="text-green-500"]') as HTMLButtonElement;
    await act(async () => {
      checkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 0));
    });

    expect(api.updateInstitution).toHaveBeenCalledWith('i1', { guardia_feriado_rate: 1250.5 });
    expect(container.textContent).toContain('No se pudo guardar la tarifa');
  });

  it('calls the API with the decimal value and clears the error on success', async () => {
    vi.mocked(api.updateInstitution).mockResolvedValueOnce(makeInstitution({ guardia_feriado_rate: 1250.5 }));

    await act(async () => {
      root.render(<RateEditor institution={makeInstitution()} onInstitutionChange={() => {}} />);
    });

    const feriadoLabel = container.querySelector('span[title="Valor por hora de guardia en feriado nacional"]')!;
    const pencil = feriadoLabel.querySelector('button[title="Editar"]') as HTMLButtonElement;
    act(() => { pencil.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const input = container.querySelector('input[placeholder="Ingresá valor"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(input, '1250,50');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const checkBtn = container.querySelector('button[class*="text-green-500"]') as HTMLButtonElement;
    await act(async () => {
      checkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 0));
    });

    expect(api.updateInstitution).toHaveBeenCalledWith('i1', { guardia_feriado_rate: 1250.5 });
    expect(container.textContent).toContain('Guardia Feriado actualizada');
    expect(container.textContent).not.toContain('No se pudo guardar la tarifa');
  });

  it('formats the edit input es-AR style as you type (thousands dot, decimal comma)', async () => {
    await act(async () => {
      root.render(<RateEditor institution={makeInstitution()} onInstitutionChange={() => {}} />);
    });

    const feriadoLabel = container.querySelector('span[title="Valor por hora de guardia en feriado nacional"]')!;
    const pencil = feriadoLabel.querySelector('button[title="Editar"]') as HTMLButtonElement;
    act(() => { pencil.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const input = container.querySelector('input[placeholder="Ingresá valor"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(input, '1250,50');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(input.value).toBe('1.250,50');
  });

  it('does NOT call the API when blurring an untouched prefilled rate (ghost-error fix)', async () => {
    await act(async () => {
      root.render(<RateEditor institution={makeInstitution({ guardia_feriado_rate: 20000 })} onInstitutionChange={() => {}} />);
    });

    // Open the editor on a rate that ALREADY has a value → input prefills "20.000"
    const feriadoLabel = container.querySelector('span[title="Valor por hora de guardia en feriado nacional"]')!;
    const pencil = feriadoLabel.querySelector('button[title="Editar"]') as HTMLButtonElement;
    act(() => { pencil.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const input = container.querySelector('input[placeholder="Ingresá valor"]') as HTMLInputElement;
    expect(input.value).toBe('20.000');

    // Confirm without editing → no-op, no API call, no error feedback
    const checkBtn = container.querySelector('button[class*="text-green-500"]') as HTMLButtonElement;
    await act(async () => {
      checkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 0));
    });

    expect(api.updateInstitution).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('No se pudo guardar la tarifa');
  });

  it('calls the API with null when clearing a set rate (explicit clear)', async () => {
    vi.mocked(api.updateInstitution).mockResolvedValueOnce(makeInstitution({ guardia_feriado_rate: null }));

    await act(async () => {
      root.render(<RateEditor institution={makeInstitution({ guardia_feriado_rate: 20000 })} onInstitutionChange={() => {}} />);
    });

    const feriadoLabel = container.querySelector('span[title="Valor por hora de guardia en feriado nacional"]')!;
    const pencil = feriadoLabel.querySelector('button[title="Editar"]') as HTMLButtonElement;
    act(() => { pencil.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    // Empty the field → parseRateInput('') → null → must save (clear), not skip
    const input = container.querySelector('input[placeholder="Ingresá valor"]') as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const checkBtn = container.querySelector('button[class*="text-green-500"]') as HTMLButtonElement;
    await act(async () => {
      checkBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 0));
    });

    expect(api.updateInstitution).toHaveBeenCalledWith('i1', { guardia_feriado_rate: null });
  });
});
