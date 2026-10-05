/**
 * Composición de la aplicación.
 *
 * El componente no calcula nada del dominio: reúne los almacenes (incidentes,
 * ajustes, ruta), el estado de la tabla (`useIncidents`) y las acciones que
 * las vistas comparten, y decide qué vista se pinta. Toda la lógica vive en
 * hooks y funciones puras, que es lo que hace posible probarla sin montar la
 * aplicación.
 *
 * La ventana de la app flota sobre el fondo a partir de `lg`; por debajo ocupa
 * la pantalla entera y la barra lateral se convierte en un cajón.
 */

import { ClipboardList, CodeXml, Download, Keyboard, Link2, Play, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { HandoffDialog } from '@/components/dialogs/HandoffDialog';
import { NewIncidentDialog } from '@/components/dialogs/NewIncidentDialog';
import { ShortcutsDialog } from '@/components/dialogs/ShortcutsDialog';
import { IncidentDetailPanel } from '@/components/incidents/IncidentDetailPanel';
import { CommandPalette, type PaletteCommand } from '@/components/layout/CommandPalette';
import { MobileNav } from '@/components/layout/MobileNav';
import { ALL_NAV, REPOSITORY_URL, VIEW_TITLE } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { Toaster } from '@/components/ui/Toaster';
import { AnalyticsView } from '@/components/views/AnalyticsView';
import { BoardView } from '@/components/views/BoardView';
import { CalendarView } from '@/components/views/CalendarView';
import { IncidentsView } from '@/components/views/IncidentsView';
import { PanelView } from '@/components/views/PanelView';
import { SettingsView } from '@/components/views/SettingsView';
import { TeamView } from '@/components/views/TeamView';
import { settingsStore } from '@/data/settings';
import { incidentStore, type IncidentDraft } from '@/data/store';
import { toasts } from '@/data/toasts';
import { useIncidents, type FilterPreset } from '@/hooks/useIncidents';
import { useIncidentStore, useRoute, useSettings } from '@/hooks/useStore';
import { STATUS_META, UNRESOLVED_STATUSES } from '@/lib/catalog';
import { downloadTextFile, incidentsToCsv } from '@/lib/csv';
import { toLocalDateKey } from '@/lib/format';
import { hasModifier, isTypingTarget } from '@/lib/keyboard';
import { router, type View } from '@/lib/router';
import type { Incident, IncidentStatus } from '@/types';
import type { AppActions, ViewProps } from '@/types/app';

/** Margen para pulsar la segunda tecla de un atajo `g` + letra. */
const SEQUENCE_MS = 1200;

const UNRESOLVED_PRESET: FilterPreset = { statuses: UNRESOLVED_STATUSES };

function anyDialogOpen(): boolean {
  return document.querySelector('dialog[open]') !== null;
}

export default function App() {
  const store = useIncidentStore();
  const settings = useSettings();
  const route = useRoute();
  const { incidents, now } = store;

  const table = useIncidents(incidents, route);
  const { selectIncident, applyPreset } = table;

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newIncidentOpen, setNewIncidentOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  /**
   * Al cambiar de vista no hay recarga que anuncie nada. El título de la
   * pestaña, el scroll al inicio y el foco en el `h1` nuevo son los tres
   * avisos que una navegación tradicional daba gratis.
   *
   * Se compara contra la ruta anterior, y no contra "es el primer render",
   * para que el doble montaje de StrictMode no mueva el foco al cargar.
   */
  const previousRoute = useRef<View | null>(null);
  useEffect(() => {
    document.title = `${VIEW_TITLE[route]} · Centinela`;

    const previous = previousRoute.current;
    previousRoute.current = route;
    if (previous === null || previous === route) return;

    mainRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [route]);

  const actions = useMemo<AppActions>(() => {
    /** Aviso con "Deshacer", si las confirmaciones están activas. */
    const confirm = (title: string, previous: Incident) => {
      if (!settingsStore.getSnapshot().actionToasts) return;
      toasts.push({
        title,
        tone: 'success',
        action: { label: 'Deshacer', run: () => incidentStore.restore(previous) },
      });
    };

    return {
      navigate: router.navigate,
      openIncident: selectIncident,

      showIncidents: (preset: FilterPreset) => {
        router.navigate('incidentes');
        applyPreset(preset);
      },

      newIncident: () => setNewIncidentOpen(true),
      openHandoff: () => setHandoffOpen(true),

      moveIncident: (incident: Incident, status: IncidentStatus) => {
        if (incident.status === status) return;
        const label = STATUS_META[status].label;
        incidentStore.setStatus(incident.id, status, label, settingsStore.getSnapshot().me);
        confirm(`${incident.id} pasó a «${label}»`, incident);
      },

      assignIncident: (incident: Incident, assignee: string) => {
        if (incident.assignee === assignee) return;
        incidentStore.assign(incident.id, assignee, settingsStore.getSnapshot().me);
        confirm(`${incident.id} reasignado a ${assignee}`, incident);
      },

      exportCsv: (list: readonly Incident[], name: string) => {
        downloadTextFile(
          `centinela-incidentes-${name}-${toLocalDateKey(new Date())}.csv`,
          incidentsToCsv(list),
          'text/csv',
        );
        toasts.push({
          title: `${list.length} ${list.length === 1 ? 'incidente exportado' : 'incidentes exportados'}`,
          tone: 'success',
        });
      },

      copyLink: () => {
        // `clipboard` sólo existe en contexto seguro; si falla hay que decirlo
        // en lugar de fingir que copió.
        navigator.clipboard.writeText(window.location.href).then(
          () => toasts.push({ title: 'Enlace copiado', tone: 'success' }),
          () => toasts.push({ title: 'No se pudo copiar el enlace' }),
        );
      },
    };
  }, [selectIncident, applyPreset]);

  /**
   * Avisos de los incidentes críticos que trae el flujo en vivo.
   *
   * **Sólo críticos, y esto es la decisión entera.** Un aviso por cada
   * incidente convertiría el pie de la pantalla en una cascada que se aprende
   * a ignorar en treinta segundos. La memoria de lo ya anunciado va en una
   * `ref` porque `recentIds` cambia también cuando un resalte se apaga: sin
   * ella, el mismo incidente volvería a anunciarse.
   */
  const announced = useRef<ReadonlySet<string>>(new Set());
  useEffect(() => {
    const fresh = store.recentIds.filter((id) => !announced.current.has(id));
    if (fresh.length === 0) return;
    announced.current = new Set([...announced.current, ...fresh]);

    if (!store.running || !settings.criticalToasts) return;

    for (const id of fresh) {
      const incident = incidents.find((candidate) => candidate.id === id);
      if (incident === undefined || incident.severity !== 'critical') continue;

      toasts.push({
        title: 'Incidente crítico',
        description: incident.title,
        tone: 'critical',
        action: { label: 'Abrir', run: () => selectIncident(incident) },
      });
    }
  }, [store.recentIds, store.running, settings.criticalToasts, incidents, selectIncident]);

  // La paleta se abre y se cierra con el mismo atajo, así que el manejador
  // necesita saber si es ella el diálogo abierto sin volver a suscribirse.
  const paletteOpenRef = useRef(paletteOpen);
  useEffect(() => {
    paletteOpenRef.current = paletteOpen;
  }, [paletteOpen]);

  useEffect(() => {
    let awaitingSecondKey = false;
    let sequenceTimer: ReturnType<typeof setTimeout> | undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        // Con otro diálogo abierto, la paleta encima rompería su foco.
        if (anyDialogOpen() && !paletteOpenRef.current) return;
        event.preventDefault();
        setPaletteOpen((current) => !current);
        return;
      }

      // Un atajo de una sola tecla no puede dispararse mientras alguien
      // escribe, ni actuar sobre una página que un diálogo volvió inerte.
      if (hasModifier(event) || isTypingTarget(event.target) || anyDialogOpen()) return;

      if (awaitingSecondKey) {
        awaitingSecondKey = false;
        clearTimeout(sequenceTimer);
        const entry = ALL_NAV.find((candidate) => candidate.shortcut === key);
        if (entry !== undefined) {
          event.preventDefault();
          router.navigate(entry.view);
        }
        return;
      }

      if (key === 'g') {
        awaitingSecondKey = true;
        sequenceTimer = setTimeout(() => {
          awaitingSecondKey = false;
        }, SEQUENCE_MS);
      } else if (key === 'n') {
        event.preventDefault();
        setNewIncidentOpen(true);
      } else if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
      } else if (event.key === '/' && router.getSnapshot() !== 'incidentes') {
        // En la vista de incidentes la barra enfoca la búsqueda de la tabla;
        // en las demás no hay tabla, y lo más parecido es la paleta.
        event.preventDefault();
        setPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(sequenceTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const commands = useMemo<readonly PaletteCommand[]>(
    () => [
      ...ALL_NAV.map((entry) => ({
        id: `ir-${entry.view}`,
        group: 'Ir a' as const,
        label: entry.label,
        hint: `G ${entry.shortcut.toUpperCase()}`,
        icon: entry.icon,
        run: () => router.navigate(entry.view),
      })),
      {
        id: 'nuevo-incidente',
        group: 'Acciones',
        label: 'Registrar un incidente',
        hint: 'N',
        icon: Plus,
        keywords: 'nuevo crear reportar',
        run: actions.newIncident,
      },
      {
        id: 'traspaso',
        group: 'Acciones',
        label: 'Preparar el traspaso de turno',
        icon: ClipboardList,
        keywords: 'informe entrega guardia resumen',
        run: actions.openHandoff,
      },
      {
        id: 'en-vivo',
        group: 'Acciones',
        label: store.running ? 'Pausar el flujo en vivo' : 'Iniciar el flujo en vivo',
        icon: Play,
        keywords: 'tiempo real simulacion directo',
        run: incidentStore.toggleLive,
      },
      {
        id: 'exportar',
        group: 'Acciones',
        label: 'Exportar todos los incidentes a CSV',
        icon: Download,
        keywords: 'descargar excel',
        run: () => actions.exportCsv(incidents, 'todos'),
      },
      {
        id: 'copiar-enlace',
        group: 'Acciones',
        label: 'Copiar el enlace de esta vista',
        icon: Link2,
        keywords: 'compartir url',
        run: actions.copyLink,
      },
      {
        id: 'atajos',
        group: 'Acciones',
        label: 'Ver los atajos de teclado',
        hint: '?',
        icon: Keyboard,
        keywords: 'ayuda teclas',
        run: () => setShortcutsOpen(true),
      },
      {
        id: 'codigo',
        group: 'Acciones',
        label: 'Ver el código en GitHub',
        icon: CodeXml,
        keywords: 'repositorio fuente',
        run: () => {
          window.open(REPOSITORY_URL, '_blank', 'noopener');
        },
      },
    ],
    [actions, incidents, store.running],
  );

  const showAnalyst = useCallback(
    (name: string) => {
      actions.showIncidents({ assignee: name, statuses: UNRESOLVED_STATUSES });
    },
    [actions],
  );

  const handleCreate = (draft: IncidentDraft) => {
    const incident = incidentStore.createIncident(draft);
    setNewIncidentOpen(false);
    toasts.push({
      title: `${incident.id} registrado`,
      tone: 'success',
      action: { label: 'Abrir', run: () => selectIncident(incident) },
    });
  };

  const unresolvedCount = useMemo(
    () => incidents.filter((incident) => incident.resolvedAt === null).length,
    [incidents],
  );

  const viewProps: ViewProps = { incidents, now, settings, actions, headingRef };

  return (
    <div className="min-h-dvh lg:h-dvh lg:p-4 xl:p-5">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-pill focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-contrast"
      >
        Saltar al contenido
      </a>

      <div className="mx-auto flex min-h-dvh max-w-[1720px] bg-surface-shell lg:h-full lg:min-h-0 lg:gap-2 lg:overflow-hidden lg:rounded-window lg:p-2 lg:shadow-window">
        <aside className="hidden w-sidebar shrink-0 lg:block">
          <Sidebar
            route={route}
            onNavigate={router.navigate}
            unresolvedCount={unresolvedCount}
            onOpenShortcuts={() => setShortcutsOpen(true)}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-2 p-2 lg:p-0">
          {/* En móvil la página entera scrollea y la barra se queda pegada
              arriba; en escritorio scrollea sólo `main` y no hace falta. */}
          <div className="sticky top-2 z-30 lg:static">
            <Topbar
              onOpenPalette={() => setPaletteOpen(true)}
              onOpenMenu={() => setMenuOpen(true)}
              onOpenProfile={() => router.navigate('ajustes')}
              live={store.running}
              me={settings.me}
              incidents={incidents}
              now={now}
              onOpenIncident={selectIncident}
              onShowUnresolved={() => actions.showIncidents(UNRESOLVED_PRESET)}
            />
          </div>

          <main
            id="contenido"
            ref={mainRef}
            // `relative`: los `sr-only` son `position: absolute`, y sin un
            // ancestro posicionado se anclan al documento. Dentro de un
            // contenedor con scroll eso los deja "fuera" y le crea al documento
            // un desborde que nadie ve venir.
            className="scroll-area relative flex-1 rounded-panel bg-surface-panel p-3.5 sm:p-5 lg:min-h-0 lg:overflow-y-auto"
          >
            {/* La clave remonta la vista al cambiar de ruta: sus bloques
                vuelven a entrar escalonados y su estado local no se arrastra. */}
            <div key={route}>
              {route === 'panel' && (
                <PanelView
                  {...viewProps}
                  running={store.running}
                  live={store.live}
                  recentIds={store.recentIds}
                />
              )}
              {route === 'incidentes' && (
                <IncidentsView {...viewProps} table={table} recentIds={store.recentIds} />
              )}
              {route === 'tablero' && <BoardView {...viewProps} recentIds={store.recentIds} />}
              {route === 'calendario' && <CalendarView {...viewProps} />}
              {route === 'analitica' && <AnalyticsView {...viewProps} />}
              {route === 'equipo' && <TeamView {...viewProps} />}
              {route === 'ajustes' && <SettingsView {...viewProps} />}
            </div>
          </main>
        </div>
      </div>

      <MobileNav
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        route={route}
        onNavigate={router.navigate}
        unresolvedCount={unresolvedCount}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      <IncidentDetailPanel
        incident={table.selectedIncident}
        now={now}
        onClose={table.closeIncident}
        onPrev={() => table.selectAdjacentIncident(-1)}
        onNext={() => table.selectAdjacentIncident(1)}
        hasPrev={table.hasAdjacentIncident(-1)}
        hasNext={table.hasAdjacentIncident(1)}
        onChangeStatus={actions.moveIncident}
        onAssign={actions.assignIncident}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        incidents={incidents}
        onOpenIncident={selectIncident}
        onShowAnalyst={showAnalyst}
      />

      <NewIncidentDialog
        open={newIncidentOpen}
        onClose={() => setNewIncidentOpen(false)}
        me={settings.me}
        onCreate={handleCreate}
      />

      <HandoffDialog
        open={handoffOpen}
        onClose={() => setHandoffOpen(false)}
        incidents={incidents}
        now={now}
        me={settings.me}
        onOpenIncident={selectIncident}
      />

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <Toaster />
    </div>
  );
}
