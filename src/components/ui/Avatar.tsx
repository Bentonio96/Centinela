/**
 * Avatar de iniciales sobre un pastel.
 *
 * El tono sale de la ficha del analista y no de un hash del nombre: así cada
 * persona conserva su color aunque se reordene el equipo, y dos analistas
 * vecinos en una lista nunca comparten tono por azar.
 *
 * El punto de estado no depende sólo del color: "en turno" es un punto lleno y
 * "fuera de turno" un aro vacío.
 */

import { findAnalyst } from '@/data/team';
import { AVATAR_TINT_CLASS } from '@/lib/catalog';
import { cn } from '@/lib/cn';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Readonly<Record<AvatarSize, string>> = {
  xs: 'size-6 text-[0.5625rem]',
  sm: 'size-8 text-[0.6875rem]',
  md: 'size-10 text-xs',
  lg: 'size-14 text-base',
  xl: 'size-18 text-xl',
};

const DOT_CLASSES: Readonly<Record<AvatarSize, string>> = {
  xs: 'size-2',
  sm: 'size-2.5',
  md: 'size-3',
  lg: 'size-3.5',
  xl: 'size-4',
};

interface AvatarProps {
  readonly name: string;
  readonly size?: AvatarSize;
  /** Si se pasa, dibuja el punto de presencia. */
  readonly onShift?: boolean | undefined;
  readonly className?: string;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function Avatar({ name, size = 'sm', onShift, className }: AvatarProps) {
  const analyst = findAnalyst(name);

  return (
    <span
      // Decorativo: allí donde aparece, el nombre está escrito al lado o en el
      // `title` del contenedor.
      aria-hidden="true"
      className={cn(
        'relative grid shrink-0 place-items-center rounded-pill font-semibold tracking-wide text-avatar-ink select-none',
        SIZE_CLASSES[size],
        AVATAR_TINT_CLASS[analyst?.tint ?? 'sand'],
        className,
      )}
    >
      {analyst?.initials ?? initialsOf(name)}

      {onShift !== undefined && (
        <span
          className={cn(
            'absolute right-0 bottom-0 rounded-pill ring-2 ring-surface-card',
            DOT_CLASSES[size],
            onShift ? 'bg-status-resolved' : 'border-2 border-text-muted bg-surface-card',
          )}
        />
      )}
    </span>
  );
}
