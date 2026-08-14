// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { InstitutionEditForm } from './InstitutionEditForm';
import { Institution } from '../types';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    createInstitution: vi.fn(),
    updateInstitution: vi.fn(),
  },
}));

function makeInstitution(overrides: Partial<Institution> = {}): Institution {
  return {
    id: 'i1', name: 'Hospital Test', color: null,
    guardia_rate: null, guardia_semana_rate: null, guardia_finde_rate: null,
    guardia_feriado_rate: null, procedimiento_rate: null, interconsulta_rate: null,
    is_active: true, ...overrides,
  };
}

describe('InstitutionEditForm — color requirement', () => {
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

  function setInputValue(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  function findButton(label: string): HTMLButtonElement | null {
    return Array.from(container.querySelectorAll('button')).find(b =>
      b.textContent?.trim() === label,
    ) ?? null;
  }

  it('blocks creation without a color and shows a validation error', async () => {
    await act(async () => {
      root.render(<InstitutionEditForm institutions={[]} onSave={() => {}} onCancel={() => {}} />);
    });

    const nameInput = container.querySelector('input[placeholder="Nombre de la institución"]') as HTMLInputElement;
    setInputValue(nameInput, 'Nuevo Hospital');

    const createBtn = findButton('Crear')!;
    await act(async () => {
      createBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 0));
    });

    expect(container.textContent).toContain('Elegí un color para la institución.');
    expect(api.createInstitution).not.toHaveBeenCalled();
  });

  it('creates with the chosen color once a swatch is selected', async () => {
    vi.mocked(api.createInstitution).mockResolvedValueOnce(
      makeInstitution({ name: 'Nuevo Hospital', color: '#3b82f6' }),
    );
    let savedName = '';
    await act(async () => {
      root.render(
        <InstitutionEditForm institutions={[]} onSave={(inst, name) => { savedName = name; }} onCancel={() => {}} />,
      );
    });

    const nameInput = container.querySelector('input[placeholder="Nombre de la institución"]') as HTMLInputElement;
    setInputValue(nameInput, 'Nuevo Hospital');

    // Select the blue swatch (#3b82f6, 2nd palette color)
    const swatch = container.querySelector('button[title="#3b82f6"]') as HTMLButtonElement;
    expect(swatch).not.toBeNull();
    act(() => { swatch.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

    const createBtn = findButton('Crear')!;
    await act(async () => {
      createBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 0));
    });

    expect(api.createInstitution).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nuevo Hospital', color: '#3b82f6' }),
    );
    expect(savedName).toBe('Nuevo Hospital');
  });

  it('marks a legacy institution auto-assigned color as occupied', async () => {
    // 'Legacy' has NO stored color, so getInstitutionColorMap auto-assigns it
    // '#ef4444'. Picking that color for the new institution would make Legacy's
    // dot shift on the next render — so it must be shown as occupied.
    await act(async () => {
      root.render(
        <InstitutionEditForm
          institutions={[makeInstitution({ id: 'i1', name: 'Legacy' })]}
          onSave={() => {}}
          onCancel={() => {}}
        />,
      );
    });

    expect(container.querySelector('button[aria-label="#ef4444 (en uso)"]')).not.toBeNull();
    // A truly free palette color is still selectable
    expect(container.querySelector('button[title="#3b82f6"]')).not.toBeNull();
  });

  it('pre-selects the stored color when editing', async () => {
    vi.mocked(api.updateInstitution).mockResolvedValueOnce(makeInstitution({ color: '#ef4444' }));
    await act(async () => {
      root.render(
        <InstitutionEditForm
          institution={makeInstitution({ color: '#ef4444' })}
          institutions={[]}
          onSave={() => {}}
          onCancel={() => {}}
        />,
      );
    });

    // The stored color swatch carries the ✓ checkmark
    const swatch = container.querySelector('button[title="#ef4444"]') as HTMLButtonElement;
    expect(swatch).not.toBeNull();
    expect(swatch.textContent).toContain('✓');

    const updateBtn = findButton('Actualizar')!;
    await act(async () => {
      updateBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 0));
    });

    expect(api.updateInstitution).toHaveBeenCalledWith(
      'i1',
      expect.objectContaining({ color: '#ef4444' }),
    );
  });
});
