/**
 * Dataset mock de incidentes.
 *
 * Se genera una sola vez al importar el módulo, con semilla fija, y cubre los
 * últimos 60 días. El dashboard muestra 30, pero los 30 anteriores hacen falta
 * para calcular las variaciones contra el período previo sin inventarlas.
 *
 * Las fechas son relativas al día de ejecución: el dashboard siempre se ve
 * "vivo" sin depender de un backend.
 */

import type { AffectedAsset, Incident, IncidentEvent, IncidentStatus, Severity } from '@/types';
import { chance, createRng, pick, pickMany, randomInt, type Rng } from './random';
import { ANALYSTS, ASSET_NAMES, CATEGORY_TEMPLATES, type CategoryTemplate } from './templates';

/** Semilla del dataset. Cambiarla genera un escenario distinto pero igual de estable. */
const SEED = 20_260_318;

/** Días de historia generados. La UI muestra los últimos `VISIBLE_DAYS`. */
const HISTORY_DAYS = 60;

/** Ventana del gráfico de tendencia y de las métricas. */
export const VISIBLE_DAYS = 30;

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

/** Probabilidad de que un incidente siga sin resolverse, según su antigüedad. */
function openProbability(ageInDays: number): number {
  if (ageInDays <= 1) return 0.82;
  if (ageInDays <= 3) return 0.55;
  if (ageInDays <= 7) return 0.3;
  if (ageInDays <= 14) return 0.14;
  if (ageInDays <= 30) return 0.06;
  return 0.02;
}

/**
 * Cuántos incidentes se detectan un día dado.
 * Baja los fines de semana y sube en dos picos fijos, para que la línea de
 * tendencia tenga la forma irregular de un operativo real y no una recta.
 */
function incidentsForDay(rng: Rng, daysAgo: number, weekday: number): number {
  const isWeekend = weekday === 0 || weekday === 6;
  const base = isWeekend ? randomInt(rng, 0, 2) : randomInt(rng, 2, 5);
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

function generateIncidents(): Incident[] {
  const rng = createRng(SEED);
  const now = new Date();
  const incidents: Incident[] = [];

  // De más antiguo a más reciente, para que los IDs correlativos tengan sentido.
  for (let daysAgo = HISTORY_DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const day = new Date(now.getTime() - daysAgo * DAY_MS);
    const count = incidentsForDay(rng, daysAgo, day.getDay());

    for (let i = 0; i < count; i += 1) {
      const template = pick(rng, WEIGHTED_CATEGORIES);
      const severity = pick(rng, template.severityPool);

      // Sesgo hacia horario laboral, con una cola nocturna.
      const hour = chance(rng, 0.78) ? randomInt(rng, 8, 19) : randomInt(rng, 0, 23);
      const detectedAt = new Date(day);
      detectedAt.setHours(hour, randomInt(rng, 0, 59), randomInt(rng, 0, 59), 0);
      if (detectedAt > now) {
        detectedAt.setTime(now.getTime() - randomInt(rng, 5, 200) * 60_000);
      }

      const stillOpen = chance(rng, openProbability(daysAgo));
      const [minHours, maxHours] = RESOLUTION_HOURS[severity];
      const resolutionMs = randomInt(rng, minHours * 60, maxHours * 60) * 60_000;
      const candidateResolvedAt = new Date(detectedAt.getTime() + resolutionMs);
      // Un incidente no puede cerrarse en el futuro.
      const isResolved = !stillOpen && candidateResolvedAt <= now;
      const resolvedAt = isResolved ? candidateResolvedAt : null;
      const status = resolveStatus(rng, isResolved);

      const assets = buildAssets(rng, template);
      const primaryAsset = assets[0];
      if (primaryAsset === undefined) {
        throw new Error(`La categoría ${template.category} no produjo activos afectados`);
      }
      const sourceIp = template.hasSourceIp && chance(rng, 0.85) ? randomIp(rng) : null;
      const assignee = pick(rng, ANALYSTS);
      const severityLabel = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' }[
        severity
      ];

      incidents.push({
        id: `INC-${detectedAt.getFullYear()}-${String(incidents.length + 1).padStart(4, '0')}`,
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
        timeline: buildTimeline(
          rng,
          detectedAt,
          resolvedAt,
          status,
          severity,
          assignee,
          severityLabel,
        ),
      });
    }
  }

  // Más recientes primero: es el orden por defecto de la tabla.
  return incidents.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
}

export const INCIDENTS: readonly Incident[] = generateIncidents();
