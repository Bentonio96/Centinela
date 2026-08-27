/**
 * Ayudas para los atajos de teclado globales.
 *
 * Un atajo de una sola tecla es cómodo hasta que se dispara mientras alguien
 * escribe. `isTypingTarget` es la guarda que separa "pulsó la tecla" de "está
 * escribiendo la tecla", y tiene que consultarse antes de cualquier atajo sin
 * modificador.
 */

const TYPING_TAGS: ReadonlySet<string> = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Si el evento nació dentro de algo donde se escribe. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  // `isContentEditable` cubre los editores enriquecidos, que no son ninguna de
  // las tres etiquetas anteriores pero reciben texto igual.
  return TYPING_TAGS.has(target.tagName) || target.isContentEditable;
}

/** Si hay algún modificador pulsado; entonces la tecla pertenece a otro atajo. */
export function hasModifier(event: KeyboardEvent): boolean {
  return event.ctrlKey || event.metaKey || event.altKey;
}
