import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/kit.ts', 'src/main.ts', 'src/scene/cymbalGeometry.ts', 'src/scene/materials.ts', 'src/scene/parts.ts', 'src/scene/studioEnvironment.ts'],
      exclude: ['src/scene/Studio.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
