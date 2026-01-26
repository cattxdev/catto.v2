import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['scripts/lib/**/*.ts'],
      exclude: ['scripts/lib/**/*.test.ts'],
    },
  },
});
