import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MobileNav } from './MobileNav';

const labels = {
  inicio: 'Inicio',
  turnos: 'Turnos',
  estadisticas: 'Estadísticas',
  ajustes: 'Ajustes',
};

function renderNav(isAdmin: boolean, activeView = 'inicio'): string {
  return renderToStaticMarkup(
    <MobileNav
      activeView={activeView}
      isAdmin={isAdmin}
      onNavigate={() => {}}
      onLogout={() => {}}
      labels={labels}
    />,
  );
}

describe('MobileNav view gating', () => {
  it('admin sees only Admin, Ajustes and Salir — never user screens', () => {
    const html = renderNav(true, 'admin');
    expect(html).toContain('Admin');
    expect(html).toContain(labels.ajustes);
    expect(html).toContain('Salir');
    expect(html).not.toContain(labels.inicio);
    expect(html).not.toContain(labels.turnos);
    expect(html).not.toContain(labels.estadisticas);
  });

  it('admin nav keeps the perfil/Ajustes tab reachable', () => {
    const html = renderNav(true, 'perfil');
    expect(html).toContain(labels.ajustes);
    expect(html).not.toContain(labels.inicio);
  });

  it('regular user sees the four user tabs', () => {
    const html = renderNav(false, 'inicio');
    expect(html).toContain(labels.inicio);
    expect(html).toContain(labels.turnos);
    expect(html).toContain(labels.estadisticas);
    expect(html).toContain(labels.ajustes);
    expect(html).toContain('Salir');
  });

  it('does not render the admin tab for regular users', () => {
    const html = renderNav(false, 'inicio');
    expect(html).not.toContain('>Admin<');
  });
});
