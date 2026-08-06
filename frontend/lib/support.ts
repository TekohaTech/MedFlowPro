export const SUPPORT_EMAIL = 'tekohatech@gmail.com';

export const SUPPORT_SUBJECT = '[MedFlow Pro] Soporte - Consulta';

/**
 * Builds a `mailto:` href for the shared support mailbox.
 * Subject and body are URL-encoded (spaces as %20, newlines as %0A) so the
 * link works on both desktop and mobile mail clients.
 */
export function supportMailto(options?: { name?: string }): string {
  const body = [
    'Producto: MedFlow Pro',
    options?.name ? `Nombre: ${options.name}` : null,
    'Version: v1.0.5',
    '',
    'Escribí tu consulta acá:',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_SUBJECT)}&body=${encodeURIComponent(body)}`;
}
