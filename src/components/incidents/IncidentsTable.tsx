/**
 * Tabla de incidentes para pantallas medianas y grandes.
 *
 * Sobre el teclado: el control accesible de cada fila es un `<button>` real
 * dentro de la celda del título, no la `<tr>` con `tabIndex`. Una fila con
 * `tabIndex={0}` recibe el foco pero no se anuncia como algo accionable; un
 * botón sí, y trae Enter y Espacio de fábrica. Encima de eso se añaden las
 * flechas para recorrer la lista sin salir de ella.
 *
 * El clic sobre cualquier parte de la fila abre el detalle también, pero es
 * una comodidad para el ratón: la ruta accesible es el botón.
 */

import { ChevronRight } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';

import { Table, Tbody, Td, Th, Thead, Tr } from '@/components/ui/Table';
import { CATEGORY_META } from '@/lib/catalog';
import { formatLongDateTime, formatRelativeTime } from '@/lib/format';
import type { Incident, SortableColumn, SortState } from '@/types';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

interface IncidentsTableProps {
  readonly incidents: readonly Incident[];
  readonly sort: SortState;
  readonly onToggleSort: (column: SortableColumn) => void;
  readonly selectedId: string | null;
  readonly onSelect: (incident: Incident) => void;
}

export function IncidentsTable({
  incidents,
  sort,
  onToggleSort,
  selectedId,
  onSelect,
}: IncidentsTableProps) {
  const rowButtons = useRef<(HTMLButtonElement | null)[]>([]);

  /** Dirección activa de una columna, o `null` si la tabla no se ordena por ella. */
  const directionFor = (column: SortableColumn) =>
    sort.column === column ? sort.direction : null;

  const focusRow = (index: number) => {
    const clamped = Math.max(0, Math.min(index, incidents.length - 1));
    rowButtons.current[clamped]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusRow(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusRow(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusRow(0);
        break;
      case 'End':
        event.preventDefault();
        focusRow(incidents.length - 1);
        break;
      default:
        // Enter y Espacio los maneja el propio botón.
        break;
    }
  };

  return (
    <Table caption="Listado de incidentes. Use las flechas arriba y abajo para recorrer las filas y Enter para abrir el detalle.">
      <Thead>
        <tr>
          <Th sortDirection={directionFor('id')} onSort={() => onToggleSort('id')}>
            ID
          </Th>
          <Th sortDirection={directionFor('title')} onSort={() => onToggleSort('title')}>
            Incidente
          </Th>
          <Th sortDirection={directionFor('severity')} onSort={() => onToggleSort('severity')}>
            Severidad
          </Th>
          <Th sortDirection={directionFor('status')} onSort={() => onToggleSort('status')}>
            Estado
          </Th>
          <Th
            className="hidden lg:table-cell"
            sortDirection={directionFor('category')}
            onSort={() => onToggleSort('category')}
          >
            Categoría
          </Th>
          <Th className="hidden xl:table-cell">Responsable</Th>
          <Th sortDirection={directionFor('detectedAt')} onSort={() => onToggleSort('detectedAt')}>
            Detectado
          </Th>
          <Th>
            <span className="sr-only">Abrir detalle</span>
          </Th>
        </tr>
      </Thead>

      <Tbody>
        {incidents.map((incident, index) => {
          const isSelected = incident.id === selectedId;
          const primaryAsset = incident.affectedAssets[0];

          return (
            <Tr
              key={incident.id}
              interactive
              selected={isSelected}
              // Marca la fila abierta para tecnologías de asistencia; el borde
              // izquierdo es su equivalente visual.
              aria-current={isSelected ? 'true' : undefined}
              onClick={() => onSelect(incident)}
            >
              <Td className="font-mono text-xs whitespace-nowrap text-text-muted">{incident.id}</Td>

              <Td className="max-w-md p-0">
                <button
                  ref={(element) => {
                    rowButtons.current[index] = element;
                  }}
                  type="button"
                  onClick={(event) => {
                    // La fila ya llama a `onSelect`; sin esto se dispararía dos veces.
                    event.stopPropagation();
                    onSelect(incident);
                  }}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  aria-label={`Ver detalle de ${incident.id}: ${incident.title}`}
                  className="block w-full px-cell-x py-cell-y text-left"
                >
                  <span className="block truncate font-medium text-text-primary">
                    {incident.title}
                  </span>
                  {primaryAsset !== undefined && (
                    <span className="mt-0.5 block truncate font-mono text-xs text-text-muted">
                      {primaryAsset.name}
                      {incident.affectedAssets.length > 1 &&
                        ` +${incident.affectedAssets.length - 1}`}
                    </span>
                  )}
                </button>
              </Td>

              <Td>
                <SeverityBadge severity={incident.severity} />
              </Td>

              <Td>
                <StatusBadge status={incident.status} />
              </Td>

              <Td className="hidden whitespace-nowrap lg:table-cell">
                {CATEGORY_META[incident.category].label}
              </Td>

              <Td className="hidden whitespace-nowrap xl:table-cell">{incident.assignee}</Td>

              <Td className="whitespace-nowrap">
                <time dateTime={incident.detectedAt} title={formatLongDateTime(incident.detectedAt)}>
                  {formatRelativeTime(incident.detectedAt)}
                </time>
              </Td>

              <Td className="w-8 text-right">
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 text-text-muted"
                />
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}
