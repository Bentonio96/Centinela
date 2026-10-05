/**
 * Formato de fechas, duraciones y números para la interfaz.
 *
 * Los formateadores de `Intl` se crean una sola vez a nivel de módulo: son
 * caros de construir y se usan en cada celda de la tabla.
 */

const LOCALE = 'es-CL';

// `day: 'numeric'` y no `'2-digit'`: con dos dígitos, es-CL separa el día del
// mes con un guion ("05-sept") en vez de un espacio.
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
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

/** "5 sept, 09:32" */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

/** "5 sept" — para ejes y encabezados donde la hora sobra. */
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

  // Se redondea antes de partir en días y horas: redondear sólo el resto
  // convierte 47,6 h en "1 d 24 h".
  const totalHours = Math.round(hours);
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
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

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const monthYearFormatter = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' });

const longDayFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const weekdayFormatter = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' });

const percentFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

/** "09:32" */
export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

/** "Octubre de 2026", con mayúscula inicial porque encabeza el calendario. */
export function formatMonthYear(date: Date): string {
  const text = monthYearFormatter.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "lunes, 5 de octubre" */
export function formatLongDay(date: Date): string {
  return longDayFormatter.format(date);
}

/** "lunes" */
export function formatWeekday(date: Date): string {
  return weekdayFormatter.format(date);
}

/** "72 %", con el espacio fino que pide la ortografía del español. */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio)) return '—';
  return `${percentFormatter.format(ratio * 100)} %`;
}

/** Cronómetro "01:24:09" a partir de milisegundos. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

/** Duración compacta para sitios estrechos: "45 min", "6 h", "3 d". */
export function formatCompactDuration(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} d`;
}

/** Inicio del día local que contiene ese instante. */
export function startOfLocalDay(timestamp: number): Date {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date;
}
