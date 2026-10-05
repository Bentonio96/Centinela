/**
 * Las vistas de la aplicación, con lo que la barra lateral y la paleta de
 * comandos necesitan para pintarlas.
 *
 * Vive en un archivo propio para que ambas lean la misma lista: si la paleta
 * tuviera la suya, añadir una vista sería acordarse de tocar dos sitios.
 */

import {
  CalendarDays,
  ChartNoAxesColumn,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  SquareKanban,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { View } from '@/lib/router';

export interface NavEntry {
  readonly view: View;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Segunda tecla del atajo `g` + letra. */
  readonly shortcut: string;
}

export const MAIN_NAV: readonly NavEntry[] = [
  { view: 'panel', label: 'Panel', icon: LayoutDashboard, shortcut: 'p' },
  { view: 'incidentes', label: 'Incidentes', icon: ShieldAlert, shortcut: 'i' },
  { view: 'tablero', label: 'Tablero', icon: SquareKanban, shortcut: 't' },
  { view: 'calendario', label: 'Calendario', icon: CalendarDays, shortcut: 'c' },
  { view: 'analitica', label: 'Analítica', icon: ChartNoAxesColumn, shortcut: 'a' },
  { view: 'equipo', label: 'Equipo', icon: Users, shortcut: 'e' },
];

export const GENERAL_NAV: readonly NavEntry[] = [
  { view: 'ajustes', label: 'Ajustes', icon: Settings, shortcut: 'j' },
];

export const ALL_NAV: readonly NavEntry[] = [...MAIN_NAV, ...GENERAL_NAV];

export const VIEW_TITLE: Readonly<Record<View, string>> = {
  panel: 'Panel',
  incidentes: 'Incidentes',
  tablero: 'Tablero',
  calendario: 'Calendario',
  analitica: 'Analítica',
  equipo: 'Equipo',
  ajustes: 'Ajustes',
};

export const REPOSITORY_URL = 'https://github.com/Bentonio96/Centinela';
