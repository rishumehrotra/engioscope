/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['**/__tests__/**.{ts,tsx}'],
    setupFiles: ['./setup-tests/mongo-memory-server.ts'],
    coverage: {
      reportsDirectory: '../coverage',
    },
  },
});
