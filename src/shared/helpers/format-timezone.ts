const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Derives the UTC offset label for a given IANA timezone at the current moment.
 * Returns a string like "(UTC-3)" or "(UTC+5:30)".
 */
function deriveUtcOffset(timezone: string): string {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(now);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart?.value) {
      const raw = tzPart.value; // e.g. "GMT-3" or "GMT+5:30"
      const offset = raw.replace('GMT', 'UTC');
      return `(${offset})`;
    }
  } catch {}
  return '';
}

/**
 * Formats a Date (or ISO string) in the given IANA timezone.
 * Returns: "26/05/2026 09:00 — America/Sao_Paulo (UTC-3)"
 *
 * Pass showUtcOffset: false to omit the "(UTC-3)" suffix.
 */
export function formatInTenantTimezone(
  date: Date | string,
  timezone = DEFAULT_TIMEZONE,
  options: { showUtcOffset?: boolean } = {},
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const showUtcOffset = options.showUtcOffset !== false;

  try {
    const formatted = new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);

    const utcPart = showUtcOffset ? ` ${deriveUtcOffset(timezone)}` : '';
    return `${formatted} — ${timezone}${utcPart}`;
  } catch {
    return d.toISOString();
  }
}

/**
 * Formats only the date portion (no time) in the given timezone.
 * Returns: "26/05/2026"
 */
export function formatDateInTenantTimezone(
  date: Date | string,
  timezone = DEFAULT_TIMEZONE,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return d.toISOString().split('T')[0];
  }
}
