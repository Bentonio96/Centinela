/**
 * Avisos flotantes de los incidentes críticos que van llegando en vivo.
 *
 * **Sólo críticos, y esto es la decisión entera.** Un aviso por cada incidente
 * convertiría la esquina de la pantalla en una cascada que se aprende a
 * ignorar en treinta segundos, y a partir de ahí el aviso no avisa de nada. Al
 * limitarlo a la severidad que obliga a interrumpir lo que estés haciendo, que
 * aparezca uno vuelve a significar algo.
 *
 * Cada aviso se va solo. La lista se limita a tres porque cuatro ya tapan
 * contenido, y en ese caso lo que sobra es el más viejo: el que más tiempo ha
 * tenido para ser leído.
 *
 * Con el flujo detenido la lista visible se calcula vacía *durante el render*,
 * en lugar de vaciarse con un `setState` dentro de un efecto que dispararía un
 * segundo pintado para llegar al mismo resultado. Los temporizadores en curso
 * se dejan correr y drenan el estado solos.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Incident } from '@/types';

/** Cuánto permanece un aviso en pantalla. */
const ALERT_MS = 6000;

/** Cuántos caben sin tapar la interfaz. */
const MAX_VISIBLE = 3;

/** Referencia estable para el caso vacío: evita un array nuevo por render. */
const NO_ALERTS: readonly CriticalAlert[] = [];

export interface CriticalAlert {
  readonly incident: Incident;
}

export interface UseCriticalAlertsResult {
  readonly alerts: readonly CriticalAlert[];
  readonly dismiss: (id: string) => void;
}

interface UseCriticalAlertsOptions {
  readonly incidents: readonly Incident[];
  /** Identificadores llegados hace poco, tal como los publica el flujo. */
  readonly recentIds: readonly string[];
  /** Con el flujo detenido no hay nada que anunciar. */
  readonly running: boolean;
}

export function useCriticalAlerts({
  incidents,
  recentIds,
  running,
}: UseCriticalAlertsOptions): UseCriticalAlertsResult {
  const [alerts, setAlerts] = useState<readonly CriticalAlert[]>([]);

  /**
   * Identificadores ya anunciados.
   *
   * Va en una `ref` y no en el estado porque anunciar no debe provocar un
   * render por sí mismo, y porque `recentIds` cambia también cuando un resalte
   * se apaga: sin esta memoria, el mismo incidente volvería a anunciarse.
   */
  const announced = useRef<ReadonlySet<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setAlerts((current) => current.filter((alert) => alert.incident.id !== id));
  }, []);

  useEffect(() => {
    if (!running) return;

    const fresh = recentIds
      .filter((id) => !announced.current.has(id))
      .map((id) => incidents.find((incident) => incident.id === id))
      .filter((incident): incident is Incident => incident !== undefined)
      .filter((incident) => incident.severity === 'critical');

    // Marcar todo lo visto, crítico o no: si no, un incidente leve se
    // reevaluaría en cada cambio de `recentIds` sin llegar nunca a nada.
    announced.current = new Set([...announced.current, ...recentIds]);

    if (fresh.length === 0) return;

    setAlerts((current) => [...current, ...fresh.map((incident) => ({ incident }))].slice(-MAX_VISIBLE));

    for (const incident of fresh) {
      const timer = setTimeout(() => {
        timers.current.delete(incident.id);
        setAlerts((current) => current.filter((alert) => alert.incident.id !== incident.id));
      }, ALERT_MS);
      timers.current.set(incident.id, timer);
    }
  }, [incidents, recentIds, running]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) {
        clearTimeout(timer);
      }
      pending.clear();
    };
  }, []);

  // Detener el flujo apaga los avisos en el acto: dejarlos vivos tras apagar
  // la fuente que los produce sería mentir sobre el estado de la pantalla.
  return { alerts: running ? alerts : NO_ALERTS, dismiss };
}
