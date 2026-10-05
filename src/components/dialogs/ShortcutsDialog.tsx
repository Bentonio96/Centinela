/**
 * Chuleta de atajos de teclado.
 *
 * Un atajo que no está escrito en ninguna parte no lo descubre nadie. Esta
 * lista se abre con `?`, que es la convención, y también desde la barra
 * lateral para quien no la conozca.
 */

import { Modal } from '@/components/ui/Modal';
import { ALL_NAV } from '@/components/layout/navigation';
import { PALETTE_SHORTCUT_LABEL } from '@/lib/keyboard';

interface Shortcut {
  readonly keys: readonly string[];
  readonly label: string;
}

const GENERAL: readonly Shortcut[] = [
  { keys: [PALETTE_SHORTCUT_LABEL], label: 'Abrir la paleta de comandos' },
  { keys: ['N'], label: 'Registrar un incidente' },
  { keys: ['/'], label: 'Buscar en la tabla de incidentes' },
  { keys: ['?'], label: 'Mostrar esta ayuda' },
  { keys: ['Esc'], label: 'Cerrar el panel o el diálogo abierto' },
];

const TABLE: readonly Shortcut[] = [
  { keys: ['↑', '↓'], label: 'Recorrer las filas de la tabla' },
  { keys: ['Enter'], label: 'Abrir el detalle de la fila' },
  { keys: ['←', '→'], label: 'Incidente anterior o siguiente, con el detalle abierto' },
];

const NAVIGATION: readonly Shortcut[] = ALL_NAV.map((entry) => ({
  keys: ['G', entry.shortcut.toUpperCase()],
  label: `Ir a ${entry.label}`,
}));

function ShortcutList({
  title,
  items,
}: {
  readonly title: string;
  readonly items: readonly Shortcut[];
}) {
  return (
    <section>
      <h3 className="mb-2 text-[0.6875rem] font-semibold tracking-wider text-text-muted uppercase">
        {title}
      </h3>
      <dl className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <dt className="text-sm text-text-secondary">{item.label}</dt>
            <dd className="flex shrink-0 items-center gap-1">
              {item.keys.map((key) => (
                <kbd
                  key={key}
                  className="min-w-6 rounded-md border border-border-strong bg-surface-sunken px-1.5 py-1 text-center font-sans text-[0.6875rem] leading-none font-semibold text-text-primary"
                >
                  {key}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

interface ShortcutsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Atajos de teclado"
      description="Las teclas sueltas no se disparan mientras escribes en un campo."
      size="lg"
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ShortcutList title="General" items={GENERAL} />
          <ShortcutList title="Tabla y detalle" items={TABLE} />
        </div>
        <ShortcutList title="Ir a una vista" items={NAVIGATION} />
      </div>
    </Modal>
  );
}
