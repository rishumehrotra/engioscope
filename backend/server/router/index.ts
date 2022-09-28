import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import { aggregateBuildTimelineStats } from '../../models/build-timeline.js';

const t = initTRPC.create();

const buildsRouter = t.router({
  timelineStats: t.procedure
    .input(z.object({
      collectionName: z.string(),
      project: z.string(),
      buildDefinitionId: z.number()
    }))
    .query(({ input }) => aggregateBuildTimelineStats(
      input.collectionName,
      input.project,
      input.buildDefinitionId
    ))
});

export const appRouter = t.router({
  builds: buildsRouter
});

export type AppRouter = typeof appRouter;
