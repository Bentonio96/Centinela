/**
 * Equipo: quién está, qué lleva y cuánta carga tiene.
 *
 * La carga es relativa a quien más casos abiertos tiene, no a un máximo
 * inventado. "72 %" no significa "al 72 % de su capacidad" —eso no lo sabe
 * nadie— sino "tiene el 72 % de los casos de quien más tiene". Sirve para lo
 * único que se le pide: ver de un vistazo a quién no asignarle el siguiente.
 *
 * Al filtrar por célula las tarjetas que quedan se deslizan a su sitio nuevo
 * (`useFlip`) en lugar de saltar: con ocho tarjetas iguales, sin eso no se
 * distingue cuáles se fueron de cuáles se movieron.
 */

import { MapPin, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

import { SeverityBadge } from '@/components/incidents/SeverityBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PillGroup, type PillOption } from '@/components/ui/PillGroup';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SidePanel } from '@/components/ui/SidePanel';
import { SQUADS, type Squad } from '@/data/team';
import { useFlip } from '@/hooks/useFlip';
import { SHIFT_META, SLA_STATE_META, SQUAD_LABEL, UNRESOLVED_STATUSES } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/format';
import {
  buildPriorityQueue,
  buildWorkloads,
  TREND_DAYS,
  type AnalystWorkload,
} from '@/lib/metrics';
import { slaStatus } from '@/lib/sla';
import type { ViewProps } from '@/types/app';

type SquadFilter = Squad | 'all';

const FILTER_OPTIONS: readonly PillOption<SquadFilter>[] = [
  { value: 'all', label: 'Todos' },
  ...SQUADS.map((squad) => ({ value: squad, label: SQUAD_LABEL[squad] })),
];

/** Casos que lista el perfil antes de mandar a la tabla. */
const PROFILE_CASES = 6;

const TILE_CLASS = 'rounded-control bg-surface-sunken py-2.5';

interface StatProps {
  readonly label: string;
  readonly value: string | number;
  readonly className?: string;
}

/**
 * Cifra con su etiqueta debajo. `flex-col-reverse` pone la cifra arriba a la
 * vista, pero el `dt` sigue antes que el `dd` en el DOM, como pide una `dl`.
 */
function Stat({ label, value, className }: StatProps) {
  return (
    <div className={cn('flex flex-col-reverse text-center', className)}>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="tabular text-lg leading-tight font-semibold text-text-primary">{value}</dd>
    </div>
  );
}

interface MemberCardProps {
  readonly workload: AnalystWorkload;
  readonly isMe: boolean;
  readonly onShowCases: () => void;
  readonly onOpenProfile: () => void;
}

function MemberCard({ workload, isMe, onShowCases, onOpenProfile }: MemberCardProps) {
  const { analyst, open, resolved, onShift, load } = workload;

  return (
    <li data-flip={analyst.name}>
      <Card as="article" className="flex h-full flex-col items-center p-4 text-center">
        <Avatar name={analyst.name} size="lg" onShift={onShift} />
        <h2 className="mt-3 text-[0.9375rem] font-semibold text-text-primary">
          {analyst.name}
          {isMe && <span className="font-normal text-text-muted"> (tú)</span>}
        </h2>
        <p className="text-xs text-text-muted">{analyst.role}</p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-accent-text">
            {SQUAD_LABEL[analyst.squad]}
          </span>
          <span className="text-[0.6875rem] text-text-muted">
            {onShift ? 'En turno' : `Turno de ${SHIFT_META[analyst.shift].label.toLowerCase()}`}
          </span>
        </p>

        <dl className="mt-4 grid w-full grid-cols-2 border-t border-border-subtle pt-3.5">
          <Stat label="Abiertos" value={open} />
          <Stat label={`Resueltos · ${TREND_DAYS} d`} value={resolved} />
        </dl>

        <div className="mt-3.5 w-full">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-text-muted">Carga</span>
            <span className="tabular font-semibold text-text-secondary">{formatPercent(load)}</span>
          </div>
          <ProgressBar value={load} label={`Carga de ${analyst.name}`} />
        </div>

        <div className="mt-4 grid w-full grid-cols-2 gap-2">
          <Button size="sm" onClick={onShowCases} disabled={open === 0}>
            Ver casos
          </Button>
          <Button size="sm" variant="primary" onClick={onOpenProfile}>
            Perfil
          </Button>
        </div>
      </Card>
    </li>
  );
}

export function TeamView({ incidents, now, settings, actions, headingRef }: ViewProps) {
  const [filter, setFilter] = useState<SquadFilter>('all');
  const [profileName, setProfileName] = useState<string | null>(null);

  const workloads = useMemo(() => buildWorkloads(incidents, now), [incidents, now]);
  const visible = workloads.filter((entry) => filter === 'all' || entry.analyst.squad === filter);
  const onShiftCount = workloads.filter((entry) => entry.onShift).length;

  const gridRef = useFlip<HTMLUListElement>(visible.map((entry) => entry.analyst.name).join(','));

  const profile = workloads.find((entry) => entry.analyst.name === profileName) ?? null;
  const profileCases = useMemo(
    () =>
      profileName === null
        ? []
        : buildPriorityQueue(
            incidents.filter((incident) => incident.assignee === profileName),
            now,
            PROFILE_CASES,
          ),
    [incidents, now, profileName],
  );

  const showCasesOf = (name: string) => {
    actions.showIncidents({ assignee: name, statuses: UNRESOLVED_STATUSES });
  };

  return (
    <div className="flex flex-col gap-gutter-sm">
      <PageHeader
        headingRef={headingRef}
        title="Equipo"
        description="Quién está en la guardia, qué lleva y cuánta carga tiene."
      />

      <div className="rise flex flex-wrap items-center justify-between gap-3">
        <PillGroup
          label="Filtrar por célula"
          options={FILTER_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
        <p className="text-xs text-text-muted">
          <span className="tabular font-semibold text-text-secondary">{onShiftCount}</span> en turno
          ahora
        </p>
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Nadie en esta célula"
            description="Prueba con otra célula o vuelve a ver todo el equipo."
            action={
              <Button size="sm" onClick={() => setFilter('all')}>
                Ver todos
              </Button>
            }
          />
        </Card>
      ) : (
        <ul
          ref={gridRef}
          className="rise grid grid-cols-1 gap-gutter-sm sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
        >
          {visible.map((workload) => (
            <MemberCard
              key={workload.analyst.name}
              workload={workload}
              isMe={workload.analyst.name === settings.me}
              onShowCases={() => showCasesOf(workload.analyst.name)}
              onOpenProfile={() => setProfileName(workload.analyst.name)}
            />
          ))}
        </ul>
      )}

      <SidePanel
        open={profile !== null}
        onClose={() => setProfileName(null)}
        closeLabel="el perfil"
        title={profile?.analyst.name ?? ''}
        eyebrow={
          profile !== null && (
            <div className="flex items-center gap-3">
              <Avatar name={profile.analyst.name} size="lg" onShift={profile.onShift} />
            </div>
          )
        }
      >
        {profile !== null && (
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm text-text-secondary">{profile.analyst.role}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  {profile.analyst.location}
                </span>
                <span>{SQUAD_LABEL[profile.analyst.squad]}</span>
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-2 rounded-pill',
                      profile.onShift ? 'bg-status-resolved' : 'border border-text-muted',
                    )}
                  />
                  {profile.onShift
                    ? 'En turno'
                    : `Turno de ${SHIFT_META[profile.analyst.shift].label.toLowerCase()} · ${SHIFT_META[profile.analyst.shift].hours}`}
                </span>
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-2">
              <Stat label="Abiertos" value={profile.open} className={TILE_CLASS} />
              <Stat label="Resueltos" value={profile.resolved} className={TILE_CLASS} />
              <Stat label="Carga" value={formatPercent(profile.load)} className={TILE_CLASS} />
            </dl>

            <section>
              <h3 className="mb-2 text-[0.6875rem] font-semibold tracking-wider text-text-muted uppercase">
                Casos asignados
              </h3>
              {profileCases.length === 0 ? (
                <p className="rounded-control bg-surface-sunken px-3 py-4 text-center text-sm text-text-muted">
                  Sin casos abiertos.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {profileCases.map((incident) => {
                    const { state } = slaStatus(incident, now);
                    return (
                      <li key={incident.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setProfileName(null);
                            // Tras el cierre: un diálogo no se abre encima de
                            // otro que todavía está devolviendo el foco.
                            setTimeout(() => actions.openIncident(incident), 0);
                          }}
                          className="flex w-full items-center gap-3 rounded-control bg-surface-sunken px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-text-primary">
                              {incident.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-text-muted">
                              <span className="font-mono">{incident.id}</span> ·{' '}
                              <span className={SLA_STATE_META[state].textClassName}>
                                {SLA_STATE_META[state].label}
                              </span>
                            </span>
                          </span>
                          <SeverityBadge severity={incident.severity} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <Button
              variant="primary"
              className="w-full"
              disabled={profile.open === 0}
              onClick={() => {
                const name = profile.analyst.name;
                setProfileName(null);
                setTimeout(() => showCasesOf(name), 0);
              }}
            >
              Ver todos sus casos en la tabla
            </Button>
          </div>
        )}
      </SidePanel>
    </div>
  );
}
