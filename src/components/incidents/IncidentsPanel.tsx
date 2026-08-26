/**
 * El listado completo: cabecera con el recuento, filtros, la lista y la
 * paginación.
 *
 * Bajo 768px se renderiza una lista de tarjetas y por encima una tabla. Son dos
 * árboles distintos, no el mismo oculto con CSS: renderizar ambos dejaría una
 * `<table>` invisible pero presente para los lectores de pantalla, que
 * anunciarían el listado dos veces.
 */

import { SearchX } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TABLE_BREAKPOINT, useMediaQuery } from '@/hooks/useMediaQuery';
import type { UseIncidentsResult } from '@/hooks/useIncidents';
import { formatNumber } from '@/lib/format';
import { IncidentCardList } from './IncidentCardList';
import { IncidentFilters } from './IncidentFilters';
import { IncidentsTable } from './IncidentsTable';

interface IncidentsPanelProps {
  /** Estado completo de la vista, tal como lo devuelve `useIncidents`. */
  readonly state: UseIncidentsResult;
}

export function IncidentsPanel({ state }: IncidentsPanelProps) {
  const isWideEnoughForTable = useMediaQuery(TABLE_BREAKPOINT);
  const isEmpty = state.incidents.length === 0;

  return (
    <Card as="section" aria-labelledby="incidentes-titulo" className="overflow-hidden">
      <CardHeader>
        <CardTitle id="incidentes-titulo">Incidentes</CardTitle>

        {/* El recuento cambia lejos del control que lo provoca, así que se anuncia. */}
        <p role="status" className="text-xs text-text-muted">
          {state.filteredCount === state.totalCount ? (
            <>
              <span className="tabular">{formatNumber(state.totalCount)}</span> en total
            </>
          ) : (
            <>
              <span className="tabular font-medium text-text-secondary">
                {formatNumber(state.filteredCount)}
              </span>{' '}
              de <span className="tabular">{formatNumber(state.totalCount)}</span>
            </>
          )}
        </p>
      </CardHeader>

      <IncidentFilters
        search={state.search}
        onSearchChange={state.setSearch}
        severities={state.severities}
        onToggleSeverity={state.toggleSeverity}
        hasActiveFilters={state.hasActiveFilters}
        onClearFilters={state.clearFilters}
      />

      {isEmpty ? (
        <EmptyState
          icon={SearchX}
          title="Ningún incidente coincide"
          description="Ajusta la búsqueda o quita algún filtro de severidad para ampliar el resultado."
          action={
            state.hasActiveFilters ? (
              <Button size="sm" onClick={state.clearFilters}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : isWideEnoughForTable ? (
        <IncidentsTable
          incidents={state.incidents}
          sort={state.sort}
          onToggleSort={state.toggleSort}
          selectedId={state.selectedIncident?.id ?? null}
          onSelect={state.selectIncident}
        />
      ) : (
        <IncidentCardList
          incidents={state.incidents}
          selectedId={state.selectedIncident?.id ?? null}
          onSelect={state.selectIncident}
        />
      )}

      <Pagination page={state.page} pageCount={state.pageCount} onPageChange={state.goToPage} />
    </Card>
  );
}
