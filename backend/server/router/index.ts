import { t } from './trpc.js';
import builds from './builds.js';
import others from './others.js';

export const appRouter = t.router({
  builds,
  ...others
});

export type AppRouter = typeof appRouter;
