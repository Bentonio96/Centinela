/**
 * Estado vacío. Además de decir que no hay nada, ofrece la salida:
 * un callejón sin salida es un error de diseño, no un caso borde.
 */

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  /** Acción para recuperarse, típicamente limpiar los filtros. */
  readonly action?: ReactNode;
  readonly className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-4.5 py-12 text-center', className)}>
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-pill bg-accent-soft text-accent-text"
      >
        <Icon className="size-5" />
      </span>
      <p className="mt-1 text-sm font-semibold text-text-primary">{title}</p>
      <p className="max-w-sm text-sm text-text-secondary">{description}</p>
      {action !== undefined && <div className="mt-2">{action}</div>}
    </div>
  );
}
