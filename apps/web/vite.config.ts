/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      workbox: {
        // Runtime configuration must never be served stale from the precache.
        globIgnores: ['**/env-config.js'],
        navigateFallbackDenylist: [/^\/env-config\.js$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/env-config.js',
            handler: 'NetworkFirst',
            options: { cacheName: 'runtime-config' },
          },
        ],
      },
      manifest: {
        id: '/',
        name: 'My Daily Routine',
        short_name: 'Daily Routine',
        description: 'A simple daily task manager',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
