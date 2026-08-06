import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginView } from './LoginView';
import { SUPPORT_EMAIL } from '../../lib/support';

function renderLogin(language: 'es' | 'en' = 'es'): string {
  return renderToStaticMarkup(
    <LoginView
      onLogin={async () => {}}
      loginError=""
      isLoading={false}
      settings={{ language, darkMode: false, currency: 'ARS' }}
    />,
  );
}

describe('LoginView support link', () => {
  it('renders a single mailto link to the shared support mailbox with the classified subject', () => {
    const html = renderLogin();
    expect((html.match(/<a\s/g) ?? []).length).toBe(1);
    expect(html).toContain(`href="mailto:${SUPPORT_EMAIL}?subject=`);
    expect(html).toContain('%5BMedFlow%20Pro%5D%20Soporte%20-%20Consulta');
  });

  it('shows the translated help prompt text', () => {
    const html = renderLogin();
    expect(html).toContain('¿Necesitás ayuda?');
    expect(html).toContain('Contáctanos');
  });

  it('shows the English prompt when the app language is en', () => {
    const html = renderLogin('en');
    expect(html).toContain('Need help?');
    expect(html).toContain('Contact us');
  });
});
