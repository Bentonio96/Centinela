import { INCIDENTS } from '@/data/incidents';

/**
 * Provisional: verifica que los tokens de diseño y la capa de datos estén
 * conectados. Se reemplaza por el dashboard en la fase de componentes.
 */
export default function App() {
  return (
    <main className="min-h-dvh bg-surface-base p-gutter">
      <h1 className="text-lg font-semibold text-text-primary">Centinela</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Fundación lista: <span className="tabular font-mono">{INCIDENTS.length}</span> incidentes en
        el dataset.
      </p>
    </main>
  );
}
