/**
 * Botón con variantes cerradas.
 *
 * Las clases de cada variante se escriben completas para que Tailwind las
 * encuentre al escanear el código, y para que leer el objeto baste para saber
 * cómo se ve cada una.
 */

import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'icon';

const VARIANT_CLASSES: Readonly<Record<ButtonVariant, string>> = {
  primary: 'bg-accent text-accent-contrast hover:bg-accent-hover border border-transparent',
  outline:
    'border border-border-strong bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary',
  ghost: 'border border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary',
};

const SIZE_CLASSES: Readonly<Record<ButtonSize, string>> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  icon: 'size-9',
};

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
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
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
