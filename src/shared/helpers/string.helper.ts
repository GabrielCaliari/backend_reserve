/**
 * String utility helpers
 */

export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function capitalizeWords(str: string): string {
  if (!str) return '';
  return str
    .split(' ')
    .map((word) => capitalize(word))
    .join(' ');
}

export function escapeHtml(str: unknown): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#x60;',
    '=': '&#x3D;',
    '/': '&#x2F;',
  };
  return String(str).replace(/[&<>"'`=\/]/g, (char) => map[char]);
}

export function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function gerarSenha(tamanho = 6): string {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@';
  let senha = '';

  for (let i = 0; i < tamanho; i++) {
    const indice = Math.floor(Math.random() * caracteres.length);
    senha += caracteres[indice];
  }

  return senha;
}
