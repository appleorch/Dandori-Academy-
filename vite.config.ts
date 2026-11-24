import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths, so the build runs from any folder a host serves it under.
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    // Libraries in chunks of their own, so a new game build leaves them cached in the browser.
    // Three.js and the physics engine only load when a day starts.
    // The physics chunk is ~4.3 MB because @dimforge/rapier3d-compat inlines its WASM; it is
    // fetched in idle time from the menus, never before the first screen.
    chunkSizeWarningLimit: 4500,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|zustand)[\\/]/ },
            { name: 'three', test: /node_modules[\\/](three|@react-three)[\\/]/ },
          ],
        },
      },
    },
  },
  // Whole-lesson playthroughs simulate up to twenty minutes of game time.
  test: { environment: 'node', include: ['src/**/*.test.ts'], testTimeout: 60000 },
});
