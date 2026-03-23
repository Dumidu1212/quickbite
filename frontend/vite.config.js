// vite.config.js
//
// Vite build and dev server configuration.
//
// DEV PROXY:
//   In development, each API path prefix is forwarded to the correct service.
//   This mirrors the Azure API Management routing in production.
//   The frontend always calls relative paths like /auth/login or /restaurants/
//   without needing to know which port each service runs on.
//
//   Path → Service mapping:
//     /auth, /users   → User service  (port 3001)
//     /restaurants,
//     /menu           → Menu service  (port 8001)
//     /orders         → Order service (port 3002)  [Sprint 3]
//     /notify         → Notify service (port 8002) [Sprint 3]

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: true,

    // Dev proxy — routes API paths to the correct backend service
    proxy: {
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/users': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/restaurants': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/menu': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/orders': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/notify': {
        target: 'http://localhost:8002',
        changeOrigin: true,
      },
    },
  },
});
