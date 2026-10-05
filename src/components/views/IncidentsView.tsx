/**
 * Incidentes: el listado completo, con sus filtros, su orden y su paginación.
 *
 * Bajo 768px se renderiza una lista de tarjetas y por encima una tabla. Son dos
 * árboles distintos, no el mismo oculto con CSS: renderizar ambos dejaría una
 * `<table>` invisible pero presente para los lectores de pantalla, que
 * anunciarían el listado dos veces.
 *
 * Los atajos de arriba —"Sin resolver", "Críticos", "Mis casos"— son conjuntos
 * de filtros completos, los mismos que emiten las tarjetas del panel. Se
 * marcan activos sólo cuando la vista es exactamente ese conjunto: si alguien
 * añade una búsqueda encima, ya no es "Críticos", es otra cosa.
 */

import { Download, Link2, Plus, SearchX } from 'lucide-react';
import { useMemo } from 'react';

import { ActiveFilters } from '@/components/incidents/ActiveFilters';
import { IncidentCardList } from '@/components/incidents/IncidentCardList';
import { IncidentFilters } from '@/components/incidents/IncidentFilters';
import { IncidentsTable } from '@/components/incidents/IncidentsTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import type { FilterPreset } from '@/hooks/useIncidents';
import { TABLE_BREAKPOINT, useMediaQuery } from '@/hooks/useMediaQuery';
import { UNRESOLVED_STATUSES } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { cssVars } from '@/lib/cssVars';
import { formatNumber } from '@/lib/format';
import type { LiveProps, TableState, ViewProps } from '@/types/app';

interface IncidentsViewProps extends ViewProps, Pick<LiveProps, 'recentIds'> {
  readonly table: TableState;
}

interface Shortcut {
  readonly id: string;
  readonly label: string;
  readonly preset: FilterPreset;
}

export function IncidentsView({
  settings,
  actions,
  table,
  recentIds,
  headingRef,
}: IncidentsViewProps) {
  const isWideEnoughForTable = useMediaQuery(TABLE_BREAKPOINT);
  const isEmpty = table.incidents.length === 0;

  // "Mis casos" depende de con qué analista se usa la consola.
  const shortcuts = useMemo<readonly Shortcut[]>(
    () => [
      { id: 'todos', label: 'Todos', preset: {} },
      { id: 'abiertos', label: 'Sin resolver', preset: { statuses: UNRESOLVED_STATUSES } },
      {
        id: 'criticos',
        label: 'Críticos',
        preset: { severities: ['critical'], statuses: UNRESOLVED_STATUSES },
      },
      {
        id: 'mios',
        label: 'Mis casos',
        preset: { assignee: settings.me, statuses: UNRESOLVED_STATUSES },
      },
    ],
    [settings.me],
  );

  return (
    <div className="flex flex-col gap-gutter-sm">
      <PageHeader
        headingRef={headingRef}
        title="Incidentes"
        description="Busca, filtra y abre cualquier caso. La vista viaja en el enlace."
        actions={
          <>
            <Button variant="primary" onClick={actions.newIncident}>
              <Plus aria-hidden="true" className="size-4" />
              Nuevo incidente
            </Button>
            <Button
              onClick={() => actions.exportCsv(table.filtered, 'filtrados')}
              disabled={isEmpty}
              title="Descargar los incidentes que pasan los filtros actuales"
            >
              <Download aria-hidden="true" className="size-4" />
              Exportar CSV
            </Button>
          </>
        }
      />

      <div className="rise flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Recortes rápidos"
          className="inline-flex max-w-full flex-wrap gap-1 rounded-[1.375rem] bg-surface-card p-1 shadow-card dark:ring-1 dark:ring-border-subtle"
        >
          {shortcuts.map((shortcut) => {
            const isActive = table.isPresetActive(shortcut.preset);
            return (
              <button
                key={shortcut.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => table.applyPreset(shortcut.preset)}
                className={cn(
                  'h-8 rounded-pill px-3.5 text-xs font-semibold whitespace-nowrap transition-colors duration-150',
                  isActive
                    ? 'bg-accent text-accent-contrast shadow-[inset_0_1px_0_rgb(255_255_255/0.16)]'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                )}
              >
                {shortcut.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* El recuento cambia lejos del control que lo provoca, así que se anuncia. */}
          <p role="status" className="text-xs text-text-muted">
            {table.filteredCount === table.totalCount ? (
              <>
                <span className="tabular font-semibold text-text-secondary">
                  {formatNumber(table.totalCount)}
                </span>{' '}
                incidentes en total
              </>
            ) : (
              <>
                <span className="tabular font-semibold text-text-secondary">
                  {formatNumber(table.filteredCount)}
                </span>{' '}
                de <span className="tabular">{formatNumber(table.totalCount)}</span> incidentes
              </>
            )}
          </p>

          {/* Todo el estado de la vista vive en la URL, pero nadie que abra la
              tabla por primera vez tiene motivo para mirar la barra de
              direcciones. El botón lo convierte en algo que se descubre. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={actions.copyLink}
            title="Copiar el enlace de esta vista, con sus filtros y su orden"
          >
            <Link2 aria-hidden="true" className="size-3.5" />
            Copiar enlace
          </Button>
        </div>
      </div>

      <Card
        as="section"
        aria-label="Listado de incidentes"
        className="rise overflow-hidden"
        style={cssVars({ '--rise-delay': '80ms' })}
      >
        <IncidentFilters
          search={table.search}
          onSearchChange={table.setSearch}
          severities={table.severities}
          onToggleSeverity={table.toggleSeverity}
          category={table.category}
          onSelectCategory={table.selectCategory}
          assignee={table.assignee}
          onSelectAssignee={table.selectAssignee}
          hasActiveFilters={table.hasActiveFilters}
          onClearFilters={table.clearFilters}
        />

        <ActiveFilters
          day={table.day}
          statuses={table.statuses}
          onClearDay={() => table.selectDay(null)}
          onClearStatuses={table.clearStatuses}
        />

        {isEmpty ? (
          <EmptyState
            icon={SearchX}
            title="Ningún incidente coincide"
            description="Ajusta la búsqueda o quita algún filtro para ampliar el resultado."
            className="border-t border-border-subtle"
            action={
              table.hasActiveFilters ? (
                <Button size="sm" onClick={table.clearFilters}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : isWideEnoughForTable ? (
          <IncidentsTable
            incidents={table.incidents}
            sort={table.sort}
            onToggleSort={table.toggleSort}
            selectedId={table.selectedIncident?.id ?? null}
            onSelect={actions.openIncident}
            recentIds={recentIds}
          />
        ) : (
          <div className="border-t border-border-subtle">
            <IncidentCardList
              incidents={table.incidents}
              selectedId={table.selectedIncident?.id ?? null}
              onSelect={actions.openIncident}
              recentIds={recentIds}
            />
          </div>
        )}

        <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.goToPage} />
      </Card>
    </div>
  );
}
