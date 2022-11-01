import { t } from './trpc.js';
import builds from './builds.js';
import workItems from './workitems.js';
import others from './others.js';

export const appRouter = t.router({
  builds,
  workItems,
  ...others
});

export type AppRouter = typeof appRouter;
