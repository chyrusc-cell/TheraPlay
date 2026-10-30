import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Test configuration. It is separate from vite.config.js on purpose: the tests do
// not need Tailwind, and nothing here can affect the production build.
// Run with: npm run test (watch), npm run test:run (once), npm run test:coverage.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    // A fake API address. Requests are always mocked; this only guarantees that
    // a request that slipped through could never reach the real backend at
    // 127.0.0.1:8000.
    env: { VITE_API_URL: 'http://api.test/api' },
    // Several test files run at once, and a busy machine slows typing in jsdom
    // a lot. A correct test still finishes as soon as it can; only a broken one
    // ever waits this long.
    testTimeout: 30000,
    hookTimeout: 30000,
    // Style files are not needed to test behaviour.
    css: false,
    // Every test starts from clean mocks and a clean DOM (also see setup.js).
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{js,jsx}', 'src/main.jsx'],
      reporter: ['text-summary', 'html'],
    },
  },
})
