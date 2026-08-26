/**
 * Generador pseudoaleatorio determinista (mulberry32).
 *
 * Con semilla fija el dataset mock es idéntico en cada carga y en cada máquina:
 * las capturas del README no cambian, y no hay parpadeo de datos entre renders.
 */

export type Rng = () => number;

export function createRng(seed: number): Rng {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entero en el rango [min, max], ambos inclusive. */
export function randomInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Elige un elemento de la lista.
 * Lanza si la lista está vacía: con `noUncheckedIndexedAccess` el acceso por
 * índice es `T | undefined`, y devolver un fallback silencioso escondería un
 * error de datos en lugar de exponerlo.
 */
export function pick<T>(rng: Rng, items: readonly T[]): T {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) {
    throw new Error('pick() recibió una lista vacía');
  }
  return item;
}

/** Elige `count` elementos distintos, o todos si la lista es más corta. */
export function pickMany<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const chosen: T[] = [];
  const total = Math.min(count, pool.length);
  for (let i = 0; i < total; i += 1) {
    const [taken] = pool.splice(Math.floor(rng() * pool.length), 1);
    if (taken !== undefined) {
      chosen.push(taken);
    }
  }
  return chosen;
}

/** `true` con la probabilidad indicada (0 a 1). */
export function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}
