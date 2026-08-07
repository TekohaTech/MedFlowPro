/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            // Docker: VITE_PROXY_TARGET=http://medflow_api:8000 (backend container).
            // Local host dev: falls back to localhost:8000.
            target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
            changeOrigin: true,
          },
        },
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        include: ['lib/**/*.test.ts', 'components/**/*.test.ts', 'components/**/*.test.tsx', 'hooks/**/*.test.ts'],
        forbidOnly: true,
      },
    };
});
