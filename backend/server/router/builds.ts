import { z } from 'zod';
import t from './trpc.js';
import { aggregateBuildTimelineStats } from '../../models/build-timeline.js';

export default t.router({
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
