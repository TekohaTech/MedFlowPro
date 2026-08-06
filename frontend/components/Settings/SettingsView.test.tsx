import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsView } from './SettingsView';
import { SUPPORT_EMAIL } from '../../lib/support';

const PROFILE = {
  name: 'Dr. Ana Pérez',
  specialty: 'Cardiología',
  institution: 'Hospital Central',
  avatar: 'fem_doctor' as const,
};

function renderSettings(language: 'es' | 'en' = 'es'): string {
  return renderToStaticMarkup(
    <SettingsView
      profile={PROFILE}
      settings={{ language, darkMode: false, currency: 'ARS' }}
      onUpdateProfile={() => {}}
      onUpdateSettings={() => {}}
    />,
  );
}

describe('SettingsView support item', () => {
  it('renders a support row anchored to the shared mailbox, pre-filled with the profile name', () => {
    const html = renderSettings();
    expect(html).toContain(`<a href="mailto:${SUPPORT_EMAIL}?subject=`);
    expect(html).toContain('Nombre%3A%20Dr.%20Ana%20P%C3%A9rez');
  });

  it('shows the label and the support email as the item value', () => {
    const html = renderSettings();
    expect(html).toContain('Ayuda y soporte');
    expect(html).toContain(`>${SUPPORT_EMAIL}<`);
  });

  it('places the support item after the Preferences section and before the version footer', () => {
    const html = renderSettings();
    expect(html.indexOf('Ayuda y soporte')).toBeGreaterThan(html.indexOf('Preferencias'));
    expect(html.indexOf('Ayuda y soporte')).toBeLessThan(html.indexOf('MedFlow Pro v1.0.5'));
  });

  it('shows the English label when the app language is en', () => {
    const html = renderSettings('en');
    expect(html).toContain('Help &amp; support');
  });
});
