/**
 * Tema claro/oscuro con persistencia en `localStorage`.
 *
 * El tema oscuro es el estado por defecto y vive en `:root`; el claro se activa
 * con la clase `.light` en `<html>`. El script en línea de `index.html` aplica
 * la clase antes del primer pintado, así que este hook nunca provoca un salto
 * visual al montarse.
 */

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'centinela:theme';

/**
 * `localStorage` puede lanzar en modo privado o con las cookies bloqueadas.
 * Un tema es una preferencia, no un dato crítico: si falla, se sigue con el
 * valor por defecto en lugar de romper la aplicación.
 */
function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Preferencia no persistida: la sesión actual sigue funcionando igual.
  }
}

export interface UseThemeResult {
  readonly theme: Theme;
  readonly toggleTheme: () => void;
}

export function useTheme(): UseThemeResult {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    persistTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
