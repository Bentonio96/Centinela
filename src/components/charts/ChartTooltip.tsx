/**
 * Tooltip compartido por ambos gráficos.
 *
 * Recharts inyecta `active`, `payload` y `label` al elemento que se le pasa en
 * `content`. En vez de importar sus tipos internos se declara aquí la forma
 * mínima que este componente necesita: son menos props, quedan explícitas y no
 * atan el código a la estructura interna de la librería.
 */

export interface TooltipEntry {
  readonly name?: string | number;
  readonly value?: string | number;
  readonly color?: string;
  readonly dataKey?: string | number;
}

export interface ChartTooltipProps {
  readonly active?: boolean;
  readonly payload?: readonly TooltipEntry[];
  readonly label?: string | number;
  /** Encabezado del tooltip. Por defecto se usa `label` tal cual. */
  readonly titleFormatter?: (label: string | number) => string;
}

export function ChartTooltip({ active, payload, label, titleFormatter }: ChartTooltipProps) {
  if (active !== true || payload === undefined || payload.length === 0) {
    return null;
  }

  const title = label === undefined ? '' : (titleFormatter?.(label) ?? String(label));

  return (
    <div className="min-w-36 rounded-control border border-border-strong bg-surface-overlay px-2.5 py-2 shadow-popover">
      {title !== '' && (
        <p className="mb-1.5 text-xs font-medium text-text-primary">{title}</p>
      )}

      <ul className="flex flex-col gap-1">
        {payload.map((entry, index) => (
          <li
            key={`${String(entry.dataKey ?? index)}`}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-pill"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="tabular font-medium text-text-primary">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
