import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // vite-node does not treat `node:sqlite` as a builtin module. Route it to
      // a shim that loads the real module through Node's runtime loader.
      'node:sqlite': fileURLToPath(new URL('./tests/sqlite-shim.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    pool: 'forks',
    testTimeout: 30000,
    hookTimeout: 30000,
    exclude: ['node_modules', 'dist'],
    server: {
      deps: {
        external: [/^node:/],
      },
    },
  },
});