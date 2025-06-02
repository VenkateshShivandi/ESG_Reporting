import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    conditions: ['development'],
  },
  define: {
    // Ensure we're using development builds for testing
    'process.env.NODE_ENV': '"test"',
    __DEV__: true,
  },
  esbuild: {
    define: {
      'process.env.NODE_ENV': '"test"',
    },
  },
});
