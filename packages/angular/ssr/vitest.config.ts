import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*_spec.ts'],
    globals: true,
  },
});
