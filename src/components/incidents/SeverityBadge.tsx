/**
 * Severidad como píldora con color.
 *
 * La etiqueta de texto siempre está presente: el color es un refuerzo, nunca
 * el único portador de la información. Quien no distinga los tonos lee
 * "Crítica" igual, y el punto añade una tercera pista.
 */

import { Badge } from '@/components/ui/Badge';
import { SEVERITY_META } from '@/lib/catalog';
import type { Severity } from '@/types';

interface SeverityBadgeProps {
  readonly severity: Severity;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const meta = SEVERITY_META[severity];

  return (
    <Badge className={meta.badgeClassName} dotClassName={meta.dotClassName}>
      {meta.label}
    </Badge>
  );
}
