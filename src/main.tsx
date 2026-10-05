import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from '@/App';
import { normalizeLegacyUrl } from '@/lib/router';
import '@/index.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('No se encontró el elemento #root en index.html');
}

// Antes del primer render: los hooks leen la URL al montarse, y tiene que ser
// ya la definitiva.
normalizeLegacyUrl();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
