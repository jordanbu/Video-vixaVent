import type { Plugin } from 'vite';
import { initializeSqliteProjectStore } from '../storage/sqlite-store.ts';

/** Initialize the sole project store before feature plugins restore persisted state. */
export function storageLifecyclePlugin(): Plugin {
  return {
    name: 'vixaventora-storage-lifecycle',
    async configureServer() {
      await initializeSqliteProjectStore();
    },
  };
}
