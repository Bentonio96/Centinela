/**
 * Exportación de incidentes a CSV.
 *
 * Dos cosas que una exportación ingenua hace mal y aquí se cuidan:
 *
 * - **Inyección de fórmulas.** Una celda que empieza por `=`, `+`, `-` o `@`
 *   la ejecuta la hoja de cálculo al abrir el archivo. Los títulos de incidente
 *   son texto libre —alguien puede registrar uno a mano— así que esas celdas se
 *   prefijan con un apóstrofo, que las fuerza a texto.
 * - **Codificación.** Se antepone el BOM de UTF-8: sin él, Excel abre el
 *   archivo como Windows-1252 y "Crítica" llega como "CrÃ­tica".
 */

import type { Incident } from '@/types';
import { CATEGORY_META, SEVERITY_META, STATUS_META } from './catalog';

const FORMULA_PREFIX = /^[=+\-@\t\r]/u;

function escapeCell(value: string): string {
  const safe = FORMULA_PREFIX.test(value) ? `'${value}` : value;
  // Las comillas se duplican y la celda se envuelve siempre: es más simple y
  // más seguro que decidir caso a caso si hace falta.
  return `"${safe.replaceAll('"', '""')}"`;
}

const HEADER = [
  'ID',
  'Título',
  'Severidad',
  'Estado',
  'Categoría',
  'Responsable',
  'Detectado',
  'Cerrado',
  'IP de origen',
  'Activos afectados',
] as const;

export function incidentsToCsv(incidents: readonly Incident[]): string {
  const rows = incidents.map((incident) =>
    [
      incident.id,
      incident.title,
      SEVERITY_META[incident.severity].label,
      STATUS_META[incident.status].label,
      CATEGORY_META[incident.category].label,
      incident.assignee,
      incident.detectedAt,
      incident.resolvedAt ?? '',
      incident.sourceIp ?? '',
      incident.affectedAssets.map((asset) => asset.name).join(' | '),
    ]
      .map(escapeCell)
      .join(','),
  );

  return [HEADER.map(escapeCell).join(','), ...rows].join('\r\n');
}

/** Entrega un texto como archivo descargable, sin pasar por ningún servidor. */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob(['﻿', content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  // Se libera en el siguiente ciclo: revocar en el acto cancela la descarga en
  // algunos navegadores.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
