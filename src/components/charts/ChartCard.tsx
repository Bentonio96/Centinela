/**
 * Contenedor de gráfico: título, leyenda propia y un área de alto fijo.
 *
 * La leyenda se dibuja aquí y no con el componente `Legend` de Recharts para
 * que use los mismos tokens y la misma tipografía que el resto de la interfaz,
 * y para que quede junto al título en vez de robarle alto al gráfico.
 */

import type { ReactNode } from 'react';

import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

export interface ChartSeriesLegend {
  readonly label: string;
  /** Color de la serie, normalmente un `var(--token)`. */
  readonly color: string;
}

interface ChartCardProps {
  readonly title: string;
  /** Aclara qué se está midiendo y en qué ventana de tiempo. */
  readonly description: string;
  readonly legend?: readonly ChartSeriesLegend[];
  /** Alto del área de dibujo en píxeles. */
  readonly height: number;
  readonly children: ReactNode;
  readonly className?: string;
}

export function ChartCard({
  title,
  description,
  legend,
  height,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card as="section" className={cn('flex flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-0.5 text-xs text-text-muted">{description}</p>
        </div>

        {legend !== undefined && (
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {legend.map((series) => (
              <li key={series.label} className="flex items-center gap-1.5 text-xs text-text-secondary">
                <span
                  aria-hidden="true"
                  className="size-2 shrink-0 rounded-pill"
                  style={{ backgroundColor: series.color }}
                />
                {series.label}
              </li>
            ))}
          </ul>
        )}
      </CardHeader>

      <div className="p-2 pt-3" style={{ height }}>
        {children}
      </div>
    </Card>
  );
}
