/**
 * Cambio entre tema claro y oscuro.
 *
 * El `aria-label` describe la acción que ocurrirá, no el estado actual: es lo
 * que un botón debe anunciar. El icono muestra el tema al que se irá.
 */

import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type { Theme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  readonly theme: Theme;
  readonly onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const goingToLight = theme === 'dark';
  const Icon = goingToLight ? Sun : Moon;

  return (
    <Button
      size="icon"
      onClick={onToggle}
      aria-label={goingToLight ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={goingToLight ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
    >
      <Icon aria-hidden="true" className="size-4" />
    </Button>
  );
}
