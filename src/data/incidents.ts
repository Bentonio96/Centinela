/**
 * Dataset mock de incidentes.
 *
 * Se genera una sola vez al importar el módulo, con semilla fija, y cubre los
 * últimos 60 días. El dashboard muestra 30 (`TREND_DAYS` en `lib/metrics.ts`),
 * pero los 30 anteriores hacen falta para calcular las variaciones contra el
 * período previo sin inventarlas.
 *
 * Las fechas son relativas al día de ejecución: el dashboard siempre se ve
 * "vivo" sin depender de un backend.
 */

import type { AffectedAsset, Incident, IncidentEvent, IncidentStatus, Severity } from '@/types';
import { chance, createRng, pick, pickMany, randomInt, type Rng } from './random';
import { ANALYSTS, ASSET_NAMES, CATEGORY_TEMPLATES, type CategoryTemplate } from './templates';

/** Semilla del dataset. Cambiarla genera un escenario distinto pero igual de estable. */
const SEED = 20_260_318;

/** Días de historia generados. La UI muestra sólo la mitad más reciente. */
const HISTORY_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

const DETECTION_SOURCES = [
  'el SIEM',
  'el EDR',
  'un reporte de usuario',
  'el escaneo programado',
  'el proveedor de mitigación',
  'el monitoreo de red',
] as const;

/**
 * Horas de resolución típicas por severidad. Lo crítico se atiende antes: el
 * MTTR resultante sube a medida que baja la severidad, como en la realidad.
 */
const RESOLUTION_HOURS: Readonly<Record<Severity, readonly [number, number]>> = {
  critical: [2, 14],
  high: [6, 40],
  medium: [12, 96],
  low: [24, 210],
};

/** Etiquetas de severidad usadas dentro del texto de la bitácora generada. */
const SEVERITY_LABEL: Readonly<Record<Severity, string>> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

/**
 * Proporción de incidentes que quedan estancados y no se cierran nunca:
 * el caso escalado a un tercero, el que espera una ventana de mantenimiento,
 * el que nadie retomó.
 *
 * Es una probabilidad fija y no una función de la antigüedad a propósito. Si
 * dependiera de cuán viejo es un incidente *respecto de hoy*, el stock de
 * abiertos parecería crecer siempre: los recientes tendrían mucha probabilidad
 * de seguir abiertos y los de hace una semana ya se habrían resuelto todos.
 * Las variaciones contra el período anterior saldrían infladas por
 * construcción. Con una tasa fija el modelo es estacionario y los cambios
 * semanales reflejan sólo el flujo real de entradas y cierres.
 */
const STALLED_RATE = 0.07;

/**
 * Cuántos incidentes se detectan un día dado.
 * Baja los fines de semana y sube en dos picos fijos, para que la línea de
 * tendencia tenga la forma irregular de un operativo real y no una recta.
 */
function incidentsForDay(rng: Rng, daysAgo: number, weekday: number): number {
  const isWeekend = weekday === 0 || weekday === 6;
  const base = isWeekend ? randomInt(rng, 1, 3) : randomInt(rng, 3, 6);
  // Dos oleadas: una campaña de phishing reciente y un evento más antiguo.
  const surge = daysAgo === 4 || daysAgo === 5 ? randomInt(rng, 3, 6) : 0;
  const olderSurge = daysAgo === 19 ? randomInt(rng, 2, 4) : 0;
  return base + surge + olderSurge;
}

/** Bolsa de categorías expandida por peso, para elegir con la frecuencia deseada. */
const WEIGHTED_CATEGORIES: readonly CategoryTemplate[] = CATEGORY_TEMPLATES.flatMap((template) =>
  Array.from({ length: template.weight }, () => template),
);

function randomIp(rng: Rng): string {
  // Rangos públicos plausibles, evitando redes reservadas.
  const first = pick(rng, [45, 77, 91, 103, 152, 185, 190, 196, 201]);
  return `${first}.${randomInt(rng, 0, 255)}.${randomInt(rng, 0, 255)}.${randomInt(rng, 1, 254)}`;
}

function buildAssets(rng: Rng, template: CategoryTemplate): AffectedAsset[] {
  const count = chance(rng, 0.25) ? randomInt(rng, 2, 3) : 1;
  const kinds = pickMany(rng, template.assetKinds, Math.min(count, template.assetKinds.length));
  // Si hacen falta más activos que tipos disponibles, se repite el primer tipo.
  while (kinds.length < count) {
    kinds.push(pick(rng, template.assetKinds));
  }

  const used = new Set<string>();
  const assets: AffectedAsset[] = [];
  for (const kind of kinds) {
    const name = pick(rng, ASSET_NAMES[kind]);
    if (used.has(name)) continue;
    used.add(name);
    assets.push({ id: `${kind}-${name}`, name, kind });
  }
  return assets;
}

function buildTimeline(
  rng: Rng,
  detectedAt: Date,
  resolvedAt: Date | null,
  status: IncidentStatus,
  severity: Severity,
  assignee: string,
  severityLabel: string,
): IncidentEvent[] {
  const events: IncidentEvent[] = [
    {
      at: detectedAt.toISOString(),
      summary: `Alerta generada por ${pick(rng, DETECTION_SOURCES)}`,
      actor: 'Detección automática',
    },
    {
      at: new Date(detectedAt.getTime() + randomInt(rng, 4, 40) * 60_000).toISOString(),
      summary: `Incidente triado y clasificado con severidad ${severityLabel.toLowerCase()}`,
      actor: 'Turno de guardia',
    },
  ];

  if (status !== 'open') {
    events.push({
      at: new Date(detectedAt.getTime() + randomInt(rng, 45, 240) * 60_000).toISOString(),
      summary: 'Se inició el análisis y la recolección de evidencia',
      actor: assignee,
    });
  }

  if (status === 'contained' || status === 'resolved') {
    events.push({
      at: new Date(detectedAt.getTime() + randomInt(rng, 4, 20) * 60 * 60_000).toISOString(),
      summary:
        severity === 'critical'
          ? 'Contención aplicada: activos aislados y credenciales revocadas'
          : 'Contención aplicada sobre los activos afectados',
      actor: assignee,
    });
  }

  if (resolvedAt !== null) {
    events.push({
      at: resolvedAt.toISOString(),
      summary: 'Incidente cerrado tras verificar que no persiste actividad',
      actor: assignee,
    });
  }

  return events.sort((a, b) => a.at.localeCompare(b.at));
}

function resolveStatus(rng: Rng, isResolved: boolean): IncidentStatus {
  if (isResolved) return 'resolved';
  const roll = rng();
  if (roll < 0.42) return 'open';
  if (roll < 0.82) return 'investigating';
  return 'contained';
}

function fillTemplate(text: string, assetName: string, ip: string | null): string {
  return text.replaceAll('{asset}', assetName).replaceAll('{ip}', ip ?? 'un origen no determinado');
}

/**
 * Crea un incidente detectado en el instante dado.
 *
 * Está extraída del bucle de generación para que el modo en vivo produzca
 * incidentes con exactamente las mismas reglas que el histórico: si divergieran,
 * lo que entra en tiempo real dejaría de parecerse a lo que ya está en la tabla.
 */
export function createIncident(
  rng: Rng,
  detectedAt: Date,
  now: Date,
  sequence: number,
): Incident {
  const template = pick(rng, WEIGHTED_CATEGORIES);
  const severity = pick(rng, template.severityPool);

  // A cada incidente se le asigna su tiempo de resolución al detectarlo; que
  // hoy siga abierto es consecuencia de que ese plazo aún no se ha cumplido.
  const isStalled = chance(rng, STALLED_RATE);
  const [minHours, maxHours] = RESOLUTION_HOURS[severity];
  const resolutionMs = randomInt(rng, minHours * 60, maxHours * 60) * 60_000;
  const candidateResolvedAt = new Date(detectedAt.getTime() + resolutionMs);
  // Un incidente no puede cerrarse en el futuro.
  const isResolved = !isStalled && candidateResolvedAt <= now;
  const resolvedAt = isResolved ? candidateResolvedAt : null;
  const status = resolveStatus(rng, isResolved);

  const assets = buildAssets(rng, template);
  const primaryAsset = assets[0];
  if (primaryAsset === undefined) {
    throw new Error(`La categoría ${template.category} no produjo activos afectados`);
  }

  const sourceIp = template.hasSourceIp && chance(rng, 0.85) ? randomIp(rng) : null;
  const assignee = pick(rng, ANALYSTS);
  const severityLabel = SEVERITY_LABEL[severity];

  return {
    id: `INC-${detectedAt.getFullYear()}-${String(sequence).padStart(4, '0')}`,
    title: pick(rng, template.titles),
    description: fillTemplate(pick(rng, template.descriptions), primaryAsset.name, sourceIp),
    severity,
    status,
    category: template.category,
    detectedAt: detectedAt.toISOString(),
    resolvedAt: resolvedAt?.toISOString() ?? null,
    assignee,
    affectedAssets: assets,
    sourceIp,
    timeline: buildTimeline(rng, detectedAt, resolvedAt, status, severity, assignee, severityLabel),
  };
}

function generateIncidents(): Incident[] {
  const rng = createRng(SEED);
  const now = new Date();
  const incidents: Incident[] = [];

  // De más antiguo a más reciente, para que los IDs correlativos tengan sentido.
  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const day = new Date(now.getTime() - daysAgo * DAY_MS);
    const count = incidentsForDay(rng, daysAgo, day.getDay());

    for (let i = 0; i < count; i += 1) {
      // Sesgo hacia horario laboral, con una cola nocturna.
      const hour = chance(rng, 0.78) ? randomInt(rng, 8, 19) : randomInt(rng, 0, 23);
      const detectedAt = new Date(day);
      detectedAt.setHours(hour, randomInt(rng, 0, 59), randomInt(rng, 0, 59), 0);
      if (detectedAt > now) {
        detectedAt.setTime(now.getTime() - randomInt(rng, 5, 200) * 60_000);
      }

      incidents.push(createIncident(rng, detectedAt, now, incidents.length + 1));
    }
  }

  // Más recientes primero: es el orden por defecto de la tabla.
  return incidents.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}

export const INCIDENTS: readonly Incident[] = generateIncidents();

/**
 * Instante en que se generó el dataset.
 *
 * Todo el tablero calcula contra esta referencia en lugar de llamar a
 * `Date.now()` durante el render: así las métricas, ambos gráficos y las
 * fechas relativas de la tabla describen el mismo momento y no pueden
 * discrepar entre sí.
 */
export const GENERATED_AT: number = Date.now();

/**
 * Siguiente número de la serie de identificadores.
 * El modo en vivo continúa desde aquí en lugar de reiniciar la numeración.
 */
export const NEXT_SEQUENCE: number = INCIDENTS.length + 1;
