import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only pick up *.test.ts files
    include: ['**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
});
