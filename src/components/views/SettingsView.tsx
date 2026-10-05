/**
 * Ajustes: quién usa la consola, qué avisa y cómo se ve.
 *
 * Todo se guarda al cambiarlo, sin botón de "Guardar". Son preferencias
 * reversibles con el mismo clic que las cambió; un botón extra sólo añadiría
 * la posibilidad de irse sin haberlo pulsado.
 *
 * Las secciones son pestañas de verdad (`tablist` / `tab` / `tabpanel`), con
 * las flechas recorriéndolas, porque aquí sí se cambia de panel — a diferencia
 * de las píldoras del resto de la app, que recortan el mismo contenido.
 */

import { Bell, Database, Palette, RotateCcw, User, type LucideIcon } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CONTROL_CLASS } from '@/components/ui/control';
import { Switch } from '@/components/ui/Switch';
import { ACCENTS, settingsStore, WEEK_STARTS, type WeekStart } from '@/data/settings';
import { incidentStore } from '@/data/store';
import { findAnalyst, TEAM } from '@/data/team';
import { toasts } from '@/data/toasts';
import { ACCENT_META, SHIFT_META, SQUAD_LABEL } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import type { ViewProps } from '@/types/app';

const SECTIONS = ['perfil', 'avisos', 'apariencia', 'datos'] as const;
type Section = (typeof SECTIONS)[number];

const SECTION_META: Readonly<
  Record<Section, { readonly label: string; readonly icon: LucideIcon }>
> = {
  perfil: { label: 'Perfil', icon: User },
  avisos: { label: 'Avisos', icon: Bell },
  apariencia: { label: 'Apariencia', icon: Palette },
  datos: { label: 'Datos', icon: Database },
};

const WEEK_START_LABEL: Readonly<Record<WeekStart, string>> = {
  monday: 'Lunes',
  sunday: 'Domingo',
};

function GroupLabel({ children }: { readonly children: string }) {
  return (
    <p className="mb-2 text-[0.6875rem] font-semibold tracking-wider text-text-muted uppercase">
      {children}
    </p>
  );
}

interface ChoiceProps<T extends string> {
  readonly label: string;
  readonly options: readonly T[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly render: (option: T) => React.ReactNode;
}

/** Elección única entre pocas opciones, como botones con `aria-pressed`. */
function Choice<T extends string>({ label, options, value, onChange, render }: ChoiceProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option)}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-pill border px-3.5 text-sm font-semibold transition-colors',
              isActive
                ? 'border-accent bg-accent-soft text-text-primary'
                : 'border-border-subtle text-text-secondary hover:border-border-strong hover:text-text-primary',
            )}
          >
            {render(option)}
          </button>
        );
      })}
    </div>
  );
}

interface ToggleRowProps {
  readonly title: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

function ToggleRow({ title, description, checked, onChange }: ToggleRowProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p id={titleId} className="text-sm font-semibold text-text-primary">
          {title}
        </p>
        <p id={descriptionId} className="mt-0.5 text-sm text-text-muted">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        labelledBy={titleId}
        describedBy={descriptionId}
      />
    </div>
  );
}

export function SettingsView({ settings, headingRef }: ViewProps) {
  const [section, setSection] = useState<Section>('perfil');
  const tabRefs = useRef(new Map<Section, HTMLButtonElement>());
  const id = useId();
  const me = findAnalyst(settings.me);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = SECTIONS.indexOf(section);
    let next: Section | undefined;

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      next = SECTIONS[(index + 1) % SECTIONS.length];
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      next = SECTIONS[(index - 1 + SECTIONS.length) % SECTIONS.length];
    } else if (event.key === 'Home') {
      next = SECTIONS[0];
    } else if (event.key === 'End') {
      next = SECTIONS[SECTIONS.length - 1];
    }

    if (next === undefined) return;
    event.preventDefault();
    setSection(next);
    tabRefs.current.get(next)?.focus();
  };

  return (
    <div className="flex flex-col gap-gutter-sm">
      <PageHeader
        headingRef={headingRef}
        title="Ajustes"
        description="Tu perfil, los avisos y cómo se ve Centinela. Se guardan en este dispositivo."
      />

      <div className="grid grid-cols-1 items-start gap-gutter-sm lg:grid-cols-[14rem_minmax(0,1fr)]">
        <Card className="rise p-1.5">
          <div
            role="tablist"
            aria-label="Secciones de ajustes"
            aria-orientation="vertical"
            className="flex gap-0.5 overflow-x-auto lg:flex-col"
          >
            {SECTIONS.map((value) => {
              const { label, icon: Icon } = SECTION_META[value];
              const isActive = value === section;
              return (
                <button
                  key={value}
                  ref={(node) => {
                    if (node === null) tabRefs.current.delete(value);
                    else tabRefs.current.set(value, node);
                  }}
                  type="button"
                  role="tab"
                  id={`${id}-tab-${value}`}
                  aria-selected={isActive}
                  aria-controls={`${id}-panel-${value}`}
                  // Sólo la pestaña activa está en el orden de tabulación; a
                  // las demás se llega con las flechas.
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setSection(value)}
                  onKeyDown={handleTabKeyDown}
                  className={cn(
                    'flex h-10 shrink-0 items-center gap-2.5 rounded-control px-3 text-sm transition-colors',
                    isActive
                      ? 'bg-accent-soft font-semibold text-accent-text'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  {label}
                </button>
              );
            })}
          </div>
        </Card>

        <Card
          role="tabpanel"
          id={`${id}-panel-${section}`}
          aria-labelledby={`${id}-tab-${section}`}
          // La clave remonta el panel al cambiar de sección: la entrada se
          // vuelve a animar y el contenido anterior no deja restos.
          key={section}
          className="rise min-h-72 p-5"
        >
          {section === 'perfil' && (
            <div className="flex max-w-xl flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold">Perfil</h2>
                <p className="mt-0.5 text-sm text-text-muted">
                  Con qué analista usas la consola. Define «Mis casos» y firma lo que cambies.
                </p>
              </div>

              <div className="flex items-center gap-4 rounded-card bg-surface-sunken p-4">
                <Avatar name={settings.me} size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-text-primary">
                    {settings.me}
                  </p>
                  {me !== undefined && (
                    <p className="text-sm text-text-muted">
                      {me.role} · {SQUAD_LABEL[me.squad]} · turno de{' '}
                      {SHIFT_META[me.shift].label.toLowerCase()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${id}-me`} className="text-xs font-semibold text-text-secondary">
                  Usar la consola como
                </label>
                <select
                  id={`${id}-me`}
                  value={settings.me}
                  onChange={(event) => settingsStore.update({ me: event.target.value })}
                  className={cn(CONTROL_CLASS, 'h-10')}
                >
                  {TEAM.map((analyst) => (
                    <option key={analyst.name} value={analyst.name}>
                      {analyst.name} · {analyst.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {section === 'avisos' && (
            <div className="flex max-w-xl flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold">Avisos</h2>
                <p className="mt-0.5 text-sm text-text-muted">
                  Qué merece interrumpirte. Menos avisos, mejor atendidos.
                </p>
              </div>

              <div className="divide-y divide-border-subtle">
                <ToggleRow
                  title="Incidentes críticos en vivo"
                  description="Un aviso flotante cuando el flujo en vivo trae un incidente de severidad crítica. Sólo críticos: un aviso por cada incidente se aprende a ignorar."
                  checked={settings.criticalToasts}
                  onChange={(criticalToasts) => settingsStore.update({ criticalToasts })}
                />
                <ToggleRow
                  title="Confirmación de acciones"
                  description="Un aviso breve al cambiar el estado o el responsable de un caso."
                  checked={settings.actionToasts}
                  onChange={(actionToasts) => settingsStore.update({ actionToasts })}
                />
              </div>
            </div>
          )}

          {section === 'apariencia' && (
            <div className="flex max-w-xl flex-col gap-6">
              <div>
                <h2 className="text-lg font-semibold">Apariencia</h2>
                <p className="mt-0.5 text-sm text-text-muted">
                  El acento re-tiñe toda la consola: botones, gráficos y fondo.
                </p>
              </div>

              <div>
                <GroupLabel>Acento</GroupLabel>
                <Choice
                  label="Acento"
                  options={ACCENTS}
                  value={settings.accent}
                  onChange={(accent) => {
                    settingsStore.update({ accent });
                    toasts.push({ title: `Acento: ${ACCENT_META[accent].label}` });
                  }}
                  render={(accent) => (
                    <>
                      <span
                        aria-hidden="true"
                        className="size-5 rounded-md ring-1 ring-black/10"
                        style={{ backgroundColor: ACCENT_META[accent].swatch }}
                      />
                      {ACCENT_META[accent].label}
                    </>
                  )}
                />
              </div>

              <div>
                <GroupLabel>La semana empieza el</GroupLabel>
                <Choice
                  label="Primer día de la semana"
                  options={WEEK_STARTS}
                  value={settings.weekStart}
                  onChange={(weekStart) => settingsStore.update({ weekStart })}
                  render={(weekStart) => WEEK_START_LABEL[weekStart]}
                />
              </div>
            </div>
          )}

          {section === 'datos' && (
            <div className="flex max-w-xl flex-col gap-5">
              <div>
                <h2 className="text-lg font-semibold">Datos</h2>
                <p className="mt-0.5 text-sm text-text-muted">
                  Centinela no tiene backend: los incidentes se generan en tu navegador con una
                  semilla fija, y lo que cambies vive sólo hasta recargar.
                </p>
              </div>

              <div className="divide-y divide-border-subtle">
                <div className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      Restablecer los datos de demostración
                    </p>
                    <p className="mt-0.5 text-sm text-text-muted">
                      Descarta los incidentes creados, los cambios de estado y lo que trajo el flujo
                      en vivo.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      incidentStore.resetData();
                      toasts.push({ title: 'Datos restablecidos', tone: 'success' });
                    }}
                  >
                    <RotateCcw aria-hidden="true" className="size-3.5" />
                    Restablecer datos
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 py-3.5 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      Restablecer las preferencias
                    </p>
                    <p className="mt-0.5 text-sm text-text-muted">
                      Vuelve al acento bosque, la semana en lunes y los avisos por defecto.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      settingsStore.reset();
                      toasts.push({ title: 'Preferencias restablecidas', tone: 'success' });
                    }}
                  >
                    <RotateCcw aria-hidden="true" className="size-3.5" />
                    Restablecer preferencias
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
