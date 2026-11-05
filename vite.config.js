import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { buildCsp } from './src/cspPolicy.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiUrl = env.VITE_API_URL || 'http://127.0.0.1:8000/api'

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        // Production build only: the dev server needs inline scripts for hot reload.
        name: 'theraplay-csp',
        apply: 'build',
        transformIndexHtml: (html) =>
          html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${buildCsp(apiUrl)}" />`),
      },
    ],
  }
})
