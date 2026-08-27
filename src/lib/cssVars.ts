/**
 * Variables CSS como estilo en línea.
 *
 * `CSSProperties` de React sólo declara propiedades conocidas, así que pasar
 * `--rise-delay` obliga a una aserción. Se concentra aquí, en una función de
 * tres líneas, en lugar de repartir `as CSSProperties` por los componentes:
 * la conversión es correcta —React escribe cualquier clave que empiece por
 * `--` tal cual en el nodo— y la firma exige el prefijo, que es lo único que
 * el tipo original no sabe expresar.
 */

import type { CSSProperties } from 'react';

export function cssVars(vars: Readonly<Record<`--${string}`, string>>): CSSProperties {
  return vars as CSSProperties;
}
