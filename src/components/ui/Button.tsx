/**
 * Botón con variantes cerradas.
 *
 * Todos son píldoras: es la firma del lenguaje visual, y mezclar radios entre
 * botones haría que unos parecieran de otra aplicación. Las clases de cada
 * variante se escriben completas para que Tailwind las encuentre al escanear
 * el código, y para que leer el objeto baste para saber cómo se ve cada una.
 */

import type { ComponentProps } from 'react';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'soft';
export type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm';

const VARIANT_CLASSES: Readonly<Record<ButtonVariant, string>> = {
  primary:
    'border border-transparent bg-accent text-accent-contrast shadow-[inset_0_1px_0_rgb(255_255_255/0.16)] hover:bg-accent-hover',
  outline:
    'border border-border-strong bg-surface-card text-text-primary hover:border-text-muted hover:bg-surface-hover',
  ghost:
    'border border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary',
  soft: 'border border-transparent bg-accent-soft text-accent-text hover:bg-surface-hover',
};

const SIZE_CLASSES: Readonly<Record<ButtonSize, string>> = {
  sm: 'h-8 px-3.5 text-xs',
  md: 'h-10 px-4.5 text-sm',
  icon: 'size-10',
  'icon-sm': 'size-8',
};

// `ComponentProps` y no `ComponentPropsWithoutRef`: desde React 19 la `ref` es
// una prop más, y los menús la necesitan para devolver el foco al disparador.
interface ButtonProps extends ComponentProps<'button'> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
}

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-pill font-semibold whitespace-nowrap',
        'transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
