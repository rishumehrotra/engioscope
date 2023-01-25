// eslint-disable-next-line import/extensions
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import builds from './builds.js';
import workItems from './workitems.js';
import others from './others.js';
import analytics from './analytics.js';
import releases from './releases.js';
import projects from './projects.js';
import { t, trpcContext } from './trpc.js';

export const appRouter = t.router({
  builds,
  workItems,
  analytics,
  releases,
  projects,
  ...others,
});

export const trpcExpressHandler = createExpressMiddleware({
  router: appRouter,
  createContext: trpcContext,
});

export type AppRouter = typeof appRouter;
