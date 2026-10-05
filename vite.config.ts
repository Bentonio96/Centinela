import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separar las dependencias de la aplicación permite que el navegador
        // conserve esos chunks entre despliegues y los descargue en paralelo.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          // React cambia de versión con mucha menos frecuencia que el resto:
          // en su propio chunk sobrevive en caché a la mayoría de los deploys.
          // Vite normaliza los ids a barras normales, también en Windows.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          // Lo demás —hoy, sólo los iconos— va aparte de la aplicación: cambia
          // con las dependencias, no con cada despliegue.
          return 'vendor'
        },
      },
    },
  },
})
