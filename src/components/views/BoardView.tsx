/**
 * Tablero: los casos como tarjetas, en una columna por estado.
 *
 * Arrastrar una tarjeta a otra columna cambia su estado. Pero el arrastre es
 * el atajo, no la vía: no funciona con teclado ni en una pantalla táctil, así
 * que cada tarjeta tiene además un menú "Mover a…" que hace lo mismo. Todo lo
 * que se puede hacer arrastrando se puede hacer sin arrastrar.
 *
 * Cuando una tarjeta cambia de columna no se teletransporta: `useFlip` anima
 * el trayecto, y eso es lo que deja ver *qué* se movió cuando el cambio lo
 * provoca el menú o llega desde otra vista.
 *
 * La columna de resueltos sólo muestra los cierres recientes. Un tablero es
 * para el trabajo en curso; el histórico vive en la tabla.
 */

import { Clock, Eye, Flag, MoreHorizontal, MoveRight, Plus, Server } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Menu, type MenuItem } from '@/components/ui/Menu';
import { PillGroup, type PillOption } from '@/components/ui/PillGroup';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useFlip } from '@/hooks/useFlip';
import {
  CATEGORY_META,
  SEVERITY_META,
  SLA_STATE_META,
  STATUS_META,
  STATUS_OPTIONS,
} from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { cssVars } from '@/lib/cssVars';
import { formatCompactDuration, formatRelativeTime } from '@/lib/format';
import { sortByUrgency } from '@/lib/metrics';
import { slaStatus } from '@/lib/sla';
import type { Incident, IncidentStatus } from '@/types';
import type { LiveProps, ViewProps } from '@/types/app';

const BOARD_FILTERS = ['all', 'mine', 'urgent', 'recent'] as const;
type BoardFilter = (typeof BOARD_FILTERS)[number];

const FILTER_OPTIONS: readonly PillOption<BoardFilter>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'mine', label: 'Mis casos' },
  { value: 'urgent', label: 'Críticas y altas' },
  { value: 'recent', label: 'Últimas 24 h' },
];

const DAY_MS = 86_400_000;
/** Cuánto tiempo permanece un caso cerrado en el tablero. */
const RESOLVED_WINDOW_MS = 3 * DAY_MS;
/** Tope de la columna de resueltos, para que no crezca sin fin. */
const RESOLVED_LIMIT = 8;

type BoardViewProps = ViewProps & Pick<LiveProps, 'recentIds'>;

function matchesFilter(incident: Incident, filter: BoardFilter, me: string, now: number): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'mine':
      return incident.assignee === me;
    case 'urgent':
      return incident.severity === 'critical' || incident.severity === 'high';
    case 'recent':
      return now - Date.parse(incident.detectedAt) <= DAY_MS;
  }
}

/** Qué decir del plazo en la tarjeta: lo que falta, lo que se pasó o cuándo cerró. */
function describeTiming(incident: Incident, now: number): string {
  if (incident.resolvedAt !== null) {
    return `Cerrado ${formatRelativeTime(incident.resolvedAt, now)}`;
  }
  const { targetHours, elapsedHours } = slaStatus(incident, now);
  const remaining = targetHours - elapsedHours;
  return remaining >= 0
    ? `Vence en ${formatCompactDuration(remaining)}`
    : `Vencido hace ${formatCompactDuration(-remaining)}`;
}

interface BoardCardProps {
  readonly incident: Incident;
  readonly now: number;
  readonly dragging: boolean;
  readonly highlighted: boolean;
  readonly onOpen: (incident: Incident) => void;
  readonly onMove: (incident: Incident, status: IncidentStatus) => void;
  readonly onDragStart: (event: DragEvent<HTMLElement>, incident: Incident) => void;
  readonly onDragEnd: () => void;
}

function BoardCard({
  incident,
  now,
  dragging,
  highlighted,
  onOpen,
  onMove,
  onDragStart,
  onDragEnd,
}: BoardCardProps) {
  const category = CATEGORY_META[incident.category];
  const severity = SEVERITY_META[incident.severity];
  const sla = slaStatus(incident, now);
  const CategoryIcon = category.icon;

  const menuItems: MenuItem[] = [
    ...STATUS_OPTIONS.filter((option) => option.value !== incident.status).map((option) => ({
      id: option.value,
      label: option.label,
      icon: <MoveRight aria-hidden="true" className="size-4 text-text-muted" />,
      onSelect: () => onMove(incident, option.value),
    })),
    {
      id: 'detalle',
      label: 'Ver detalle',
      icon: <Eye aria-hidden="true" className="size-4 text-text-muted" />,
      onSelect: () => onOpen(incident),
    },
  ];

  return (
    <li data-flip={incident.id}>
      <article
        draggable
        onDragStart={(event) => onDragStart(event, incident)}
        onDragEnd={onDragEnd}
        className={cn(
          'cursor-grab rounded-[0.875rem] bg-surface-card p-3 shadow-card transition-[opacity,box-shadow] duration-150 hover:shadow-lift active:cursor-grabbing dark:ring-1 dark:ring-border-subtle',
          dragging && 'opacity-40',
          highlighted && 'row-arrival ring-2 ring-brand-400',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-surface-sunken px-1.5 py-0.5 text-[0.6875rem] font-medium text-text-secondary dark:bg-surface-hover">
            <CategoryIcon aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{category.shortLabel}</span>
          </span>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 text-[0.6875rem] font-semibold',
              severity.textClassName,
            )}
          >
            <Flag aria-hidden="true" className="size-3" />
            {severity.label}
          </span>

          <div className="ml-auto shrink-0">
            <Menu
              label={`Acciones de ${incident.id}`}
              heading="Mover a"
              items={menuItems}
              trigger={<MoreHorizontal aria-hidden="true" className="size-4" />}
              triggerClassName="grid size-6 place-items-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpen(incident)}
          aria-label={`Ver detalle de ${incident.id}: ${incident.title}`}
          className="mt-2 block w-full rounded-md text-left text-sm leading-snug font-semibold text-text-primary hover:underline"
        >
          {incident.title}
        </button>

        <ProgressBar
          value={sla.ratio}
          barClassName={SLA_STATE_META[sla.state].barClassName}
          className="mt-2.5"
        />

        <div className="mt-2.5 flex items-center gap-3 text-xs text-text-muted">
          <span
            className={cn(
              'flex min-w-0 items-center gap-1',
              (sla.state === 'breached' || sla.state === 'at-risk') &&
                SLA_STATE_META[sla.state].textClassName,
            )}
          >
            <Clock aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{describeTiming(incident, now)}</span>
          </span>
          <span
            className="flex shrink-0 items-center gap-1"
            title={incident.affectedAssets.map((asset) => asset.name).join(', ')}
          >
            <Server aria-hidden="true" className="size-3" />
            <span className="tabular">{incident.affectedAssets.length}</span>
            <span className="sr-only">
              {incident.affectedAssets.length === 1 ? 'activo afectado' : 'activos afectados'}
            </span>
          </span>
          <span className="ml-auto shrink-0" title={incident.assignee}>
            <Avatar name={incident.assignee} size="xs" />
            <span className="sr-only">Responsable: {incident.assignee}</span>
          </span>
        </div>
      </article>
    </li>
  );
}

export function BoardView({
  incidents,
  now,
  settings,
  actions,
  recentIds,
  headingRef,
}: BoardViewProps) {
  const [filter, setFilter] = useState<BoardFilter>('all');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<IncidentStatus | null>(null);

  const columns = useMemo(() => {
    const visible = incidents.filter((incident) =>
      matchesFilter(incident, filter, settings.me, now),
    );

    return STATUS_OPTIONS.map((status) => {
      const inColumn = visible.filter((incident) => incident.status === status.value);

      if (status.value === 'resolved') {
        return {
          status,
          cards: inColumn
            .filter(
              (incident) =>
                incident.resolvedAt !== null &&
                now - Date.parse(incident.resolvedAt) <= RESOLVED_WINDOW_MS,
            )
            .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))
            .slice(0, RESOLVED_LIMIT),
        };
      }

      // Arriba, lo que vence antes: la misma urgencia que la cola del panel.
      return { status, cards: sortByUrgency(inColumn, now) };
    });
  }, [incidents, filter, settings.me, now]);

  const total = columns.reduce((sum, column) => sum + column.cards.length, 0);

  // Cambia cuando una tarjeta entra, sale o cambia de sitio: es lo que le dice
  // a `useFlip` que hay posiciones nuevas que medir.
  const signature = columns
    .map((column) => column.cards.map((incident) => incident.id).join(','))
    .join('|');
  const boardRef = useFlip<HTMLDivElement>(signature);

  const handleDragStart = (event: DragEvent<HTMLElement>, incident: Incident) => {
    event.dataTransfer.setData('text/plain', incident.id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(incident.id);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setOverStatus(null);
  };

  const handleDrop = (event: DragEvent<HTMLElement>, status: IncidentStatus) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || draggingId;
    const incident = incidents.find((candidate) => candidate.id === id);
    handleDragEnd();

    if (incident !== undefined && incident.status !== status) {
      actions.moveIncident(incident, status);
    }
  };

  return (
    <div className="flex flex-col gap-gutter-sm">
      <PageHeader
        headingRef={headingRef}
        title="Tablero"
        description="Arrastra un caso a otra columna, o usa su menú para moverlo."
        actions={
          <Button variant="primary" onClick={actions.newIncident}>
            <Plus aria-hidden="true" className="size-4" />
            Nuevo incidente
          </Button>
        }
      />

      <div className="rise flex flex-wrap items-center justify-between gap-3">
        <PillGroup
          label="Filtrar el tablero"
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
        <p role="status" className="text-xs text-text-muted">
          <span className="tabular font-semibold text-text-secondary">{total}</span>{' '}
          {total === 1 ? 'caso en el tablero' : 'casos en el tablero'}
        </p>
      </div>

      <div
        ref={boardRef}
        className="grid grid-cols-1 items-start gap-gutter-sm md:grid-cols-2 xl:grid-cols-4"
      >
        {columns.map(({ status, cards }, index) => {
          const titleId = `columna-${status.value}`;
          const isOver = overStatus === status.value && draggingId !== null;

          return (
            <section
              key={status.value}
              aria-labelledby={titleId}
              onDragOver={(event) => {
                // Sin `preventDefault` el navegador no permite soltar aquí.
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                if (overStatus !== status.value) setOverStatus(status.value);
              }}
              onDragLeave={(event) => {
                // `dragleave` también se dispara al pasar sobre un hijo: sólo
                // cuenta si el puntero salió de la columna entera.
                if (
                  event.relatedTarget instanceof Node &&
                  event.currentTarget.contains(event.relatedTarget)
                ) {
                  return;
                }
                setOverStatus((current) => (current === status.value ? null : current));
              }}
              onDrop={(event) => handleDrop(event, status.value)}
              className={cn(
                'rise flex min-w-0 flex-col rounded-card bg-surface-sunken p-2 transition-[background-color,box-shadow] duration-150 dark:bg-surface-shell',
                isOver && 'bg-accent-soft ring-2 ring-brand-400 dark:bg-accent-soft',
              )}
              style={cssVars({ '--rise-delay': `${80 + index * 60}ms` })}
            >
              <header className="flex items-center gap-2 px-2 pt-1.5 pb-2.5">
                <span
                  aria-hidden="true"
                  className={cn('size-2 shrink-0 rounded-pill', status.dotClassName)}
                />
                <h2 id={titleId} className="text-sm font-semibold text-text-primary">
                  {status.label}
                </h2>
                <span className="tabular ml-auto text-xs font-semibold text-text-muted">
                  {cards.length}
                  <span className="sr-only"> {cards.length === 1 ? 'caso' : 'casos'}</span>
                </span>
              </header>

              <ul className="flex min-h-16 flex-col gap-2">
                {cards.map((incident) => (
                  <BoardCard
                    key={incident.id}
                    incident={incident}
                    now={now}
                    dragging={draggingId === incident.id}
                    highlighted={recentIds.includes(incident.id)}
                    onOpen={actions.openIncident}
                    onMove={actions.moveIncident}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))}
                {cards.length === 0 && (
                  <li className="grid flex-1 place-items-center rounded-[0.875rem] border border-dashed border-border-strong px-3 py-6 text-center text-xs text-text-muted">
                    {status.value === 'resolved'
                      ? 'Sin cierres en los últimos 3 días'
                      : `Nada en «${STATUS_META[status.value].label.toLowerCase()}»`}
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
