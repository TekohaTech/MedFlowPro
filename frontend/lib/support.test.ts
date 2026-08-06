import { describe, it, expect } from 'vitest';
import { SUPPORT_EMAIL, SUPPORT_SUBJECT, supportMailto } from './support';

describe('supportMailto', () => {
  it('targets the shared support mailbox with a URL-encoded, product-classified subject', () => {
    const href = supportMailto();
    expect(href.startsWith(`mailto:${SUPPORT_EMAIL}?subject=`)).toBe(true);
    expect(href).toContain(encodeURIComponent(SUPPORT_SUBJECT));
    // raw, unencoded subject must never reach the href
    expect(href).not.toContain(SUPPORT_SUBJECT);
  });

  it('pre-fills the body with product, version, a blank line and the prompt (name omitted when absent)', () => {
    const href = supportMailto();
    expect(href).toContain('Producto%3A%20MedFlow%20Pro%0AVersion%3A%20v1.0.5%0A%0AEscrib%C3%AD%20tu%20consulta%20ac%C3%A1%3A');
    expect(href).not.toContain('Nombre');
  });

  it('includes the profile name line when a name is provided', () => {
    const href = supportMailto({ name: 'Dr. Ana Pérez' });
    expect(href).toContain(encodeURIComponent('Nombre: Dr. Ana Pérez'));
  });

  it('encodes hostile names so they cannot smuggle params or break the href', () => {
    const hostile = 'Ana&"<script>alert(1)</script>#end%25';
    const href = supportMailto({ name: hostile });
    expect(href).not.toContain(hostile);
    // The name may only ever appear inside the body parameter, fully encoded.
    const body = decodeURIComponent(href.split('body=')[1]);
    expect(body).toContain(`Nombre: ${hostile}`);
    // No raw & or # reached the href unencoded (would split subject/body params).
    expect(href).toContain('&body=');
    expect(href.split('&body=').length).toBe(2);
  });

  it('encodes body newlines as %0A with a blank line between context and prompt', () => {
    const href = supportMailto({ name: 'Dr. Ana Pérez' });
    const body = href.split('body=')[1];
    expect(body).toContain('%0A%0A');
    expect(decodeURIComponent(body)).toBe(
      ['Producto: MedFlow Pro', 'Nombre: Dr. Ana Pérez', 'Version: v1.0.5', '', 'Escribí tu consulta acá:'].join('\n'),
    );
  });
});
