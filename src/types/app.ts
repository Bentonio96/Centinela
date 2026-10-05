/**
 * El contrato entre la raíz de la aplicación y sus vistas.
 *
 * Las vistas no conocen los almacenes ni el enrutador: reciben datos y este
 * conjunto de acciones. Eso es lo que permite que el panel, el tablero y el
 * calendario abran el mismo detalle de incidente o salten a la misma tabla
 * filtrada sin importar nada unos de otros.
 */

import type { RefObject } from 'react';

import type { FilterPreset, UseIncidentsResult } from '@/hooks/useIncidents';
import type { Settings } from '@/data/settings';
import type { LiveSession } from '@/data/store';
import type { View } from '@/lib/router';
import type { Incident, IncidentStatus } from './incident';

export interface AppActions {
  readonly navigate: (view: View) => void;
  /** Abre el panel de detalle sobre la vista actual. */
  readonly openIncident: (incident: Incident) => void;
  /** Aplica un recorte y salta a la tabla de incidentes. */
  readonly showIncidents: (preset: FilterPreset) => void;
  readonly newIncident: () => void;
  readonly openHandoff: () => void;
  /** Cambia el estado de un caso, firma la bitácora y avisa. */
  readonly moveIncident: (incident: Incident, status: IncidentStatus) => void;
  readonly assignIncident: (incident: Incident, assignee: string) => void;
  /** Descarga los incidentes dados como CSV. `name` va en el nombre del archivo. */
  readonly exportCsv: (incidents: readonly Incident[], name: string) => void;
  readonly copyLink: () => void;
}

/** Lo que recibe cada vista. No todas usan todo; ninguna recibe de más. */
export interface ViewProps {
  readonly incidents: readonly Incident[];
  /** Instante de referencia de métricas y gráficos. Ver `StoreState.now`. */
  readonly now: number;
  readonly settings: Settings;
  readonly actions: AppActions;
  /** El título de la vista: recibe el foco al navegar. Ver `PageHeader`. */
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
}

export interface LiveProps {
  readonly running: boolean;
  readonly live: LiveSession;
  /** Identificadores llegados hace poco, para resaltarlos. */
  readonly recentIds: readonly string[];
}

/** El estado de la tabla, tal como lo devuelve `useIncidents`. */
export type TableState = UseIncidentsResult;
