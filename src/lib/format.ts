/**
 * Formato de fechas, duraciones y números para la interfaz.
 *
 * Los formateadores de `Intl` se crean una sola vez a nivel de módulo: son
 * caros de construir y se usan en cada celda de la tabla.
 */

const LOCALE = 'es-CL';

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'short',
});

const longDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const mediumDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

/** "14 ago, 09:32" */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** "14 ago" — para ejes y encabezados donde la hora sobra. */
export function formatShortDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

/** "jueves, 14 de agosto de 2026, 09:32" — para el `title` emergente. */
export function formatLongDateTime(iso: string): string {
  return longDateFormatter.format(new Date(iso));
}

/**
 * "14 ago 2026, 09:32" — fecha completa en una sola línea.
 * La usa el panel de detalle, donde la versión con día de la semana se parte
 * en dos renglones y descuadra la rejilla de campos.
 */
export function formatMediumDateTime(iso: string): string {
  return mediumDateFormatter.format(new Date(iso));
}

/** "hace 3 h", "hace 5 d". Útil para saber de un vistazo qué tan fresco es algo. */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const elapsedMinutes = Math.round((now - new Date(iso).getTime()) / 60_000);

  if (elapsedMinutes < 1) return 'recién';
  if (elapsedMinutes < 60) return `hace ${elapsedMinutes} min`;

  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;

  const months = Math.floor(days / 30);
  return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
}

/**
 * Convierte horas a una duración legible: "4 h 20 min", "2 d 6 h".
 * Se usa para el tiempo medio de resolución y para la edad de un incidente.
 */
export function formatDurationFromHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '—';

  if (hours < 1) {
    return `${Math.round(hours * 60)} min`;
  }

  if (hours < 24) {
    const whole = Math.floor(hours);
    const minutes = Math.round((hours - whole) * 60);
    return minutes === 0 ? `${whole} h` : `${whole} h ${minutes} min`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours - days * 24);
  return remainingHours === 0 ? `${days} d` : `${days} d ${remainingHours} h`;
}

/** Horas transcurridas entre dos marcas ISO. */
export function hoursBetween(startIso: string, endIso: string): number {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/**
 * Variación porcentual con signo explícito: "+12 %", "−8 %", "sin cambios".
 * Usa el signo menos tipográfico, no el guion.
 */
export function formatDelta(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded === 0) return 'sin cambios';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded)} %`;
}

/** Entero con signo explícito: "+3", "−2". Usa el signo menos tipográfico. */
export function formatSignedNumber(value: number): string {
  const rounded = Math.round(value);
  if (rounded === 0) return 'sin cambios';
  return `${rounded > 0 ? '+' : '−'}${formatNumber(Math.abs(rounded))}`;
}

/** Duración con signo: "+4 h 20 min", "−1 d 2 h". */
export function formatSignedDuration(hours: number): string {
  if (Math.round(hours) === 0) return 'sin cambios';
  return `${hours > 0 ? '+' : '−'}${formatDurationFromHours(Math.abs(hours))}`;
}

/** Clave `YYYY-MM-DD` en hora local, para agrupar por día sin desfases de zona. */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
