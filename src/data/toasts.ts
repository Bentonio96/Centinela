/**
 * Avisos flotantes.
 *
 * Un almacén mínimo fuera de React para que cualquier módulo pueda avisar —el
 * de incidentes al registrar un cambio, una vista al copiar un enlace— sin
 * recibir una función por props ni depender de un contexto.
 *
 * La pila se limita a tres. Cuatro avisos ya tapan contenido, y en ese caso el
 * que sobra es el más viejo: el que más tiempo ha tenido para ser leído.
 */

export type ToastTone = 'default' | 'success' | 'critical';

export interface ToastAction {
  readonly label: string;
  readonly run: () => void;
}

export interface Toast {
  readonly id: number;
  readonly title: string;
  readonly description?: string | undefined;
  readonly tone: ToastTone;
  readonly action?: ToastAction | undefined;
}

export interface ToastInput {
  readonly title: string;
  readonly description?: string | undefined;
  readonly tone?: ToastTone | undefined;
  readonly action?: ToastAction | undefined;
  /** Cuánto permanece en pantalla. Los críticos duran más: hay que leerlos. */
  readonly durationMs?: number | undefined;
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION_MS = 3600;
const CRITICAL_DURATION_MS = 7000;

let state: readonly Toast[] = [];
let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function emit(next: readonly Toast[]): void {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

function dismiss(id: number): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
  if (state.some((toast) => toast.id === id)) {
    emit(state.filter((toast) => toast.id !== id));
  }
}

function push(input: ToastInput): number {
  const id = nextId;
  nextId += 1;

  const tone = input.tone ?? 'default';
  const toast: Toast = {
    id,
    title: input.title,
    description: input.description,
    tone,
    action: input.action,
  };

  const next = [...state, toast];
  // Lo que se cae de la pila también suelta su temporizador.
  for (const dropped of next.slice(0, Math.max(0, next.length - MAX_VISIBLE))) {
    const timer = timers.get(dropped.id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(dropped.id);
    }
  }
  emit(next.slice(-MAX_VISIBLE));

  const duration =
    input.durationMs ?? (tone === 'critical' ? CRITICAL_DURATION_MS : DEFAULT_DURATION_MS);
  timers.set(
    id,
    setTimeout(() => {
      dismiss(id);
    }, duration),
  );

  return id;
}

export const toasts = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): readonly Toast[] {
    return state;
  },

  push,
  dismiss,
} as const;
