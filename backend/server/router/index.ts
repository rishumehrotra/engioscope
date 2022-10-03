import { t } from './trpc.js';
import builds from './builds.js';

export const appRouter = t.router({
  builds
});

export type AppRouter = typeof appRouter;
