/**
 * Template rendering helper
 */
import { escapeHtml } from './string.helper';

export function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key: string) => {
    const value = key.split('.').reduce<unknown>((obj, prop) => {
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[prop];
      }
      return undefined;
    }, data);
    return value !== undefined ? escapeHtml(String(value)) : '';
  });
}
