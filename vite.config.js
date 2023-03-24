import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // This changes the output dir from dist to build
  // comment this out if that isn't relevant for your project
  build: {
    outDir: '../dist/ui'
  },
  root: 'ui',
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'ie >= 11', 'chrome >= 60'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:1337/'
    }
  },
  test: {
    include: ['**/__tests__/**.{ts,tsx}'],
    setupFiles: ["./setup-tests/mongo-memory-server.ts"],
    coverage: {
      reportsDirectory: '../coverage'
    }
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version)
  }
});
