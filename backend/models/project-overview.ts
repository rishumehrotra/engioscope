import { z } from 'zod';
import { queryContextInputParser } from './utils.js';
import {
  getChangeLoadTimeGraph,
  getCycleTimeGraph,
  getFlowEfficiencyGraph,
  getNewGraph,
  getVelocityGraph,
  getWipGraph,
} from './workitems2.js';

type WorkItemStats = {
  newWorkItems: Awaited<ReturnType<typeof getNewGraph>>;
  velocityWorkItems: Awaited<ReturnType<typeof getVelocityGraph>>;
  cltWorkItems: Awaited<ReturnType<typeof getChangeLoadTimeGraph>>;
  flowEfficiencyWorkItems: Awaited<ReturnType<typeof getFlowEfficiencyGraph>>;
  cycleTimeWorkItems: Awaited<ReturnType<typeof getCycleTimeGraph>>;
  wipTrendWorkItems: Awaited<ReturnType<typeof getWipGraph>>;
};

export type ProjectOverviewStats = WorkItemStats;

const projectOverViewStatsInputParser = z.object({
  queryContext: queryContextInputParser,
  filters: z
    .array(z.object({ label: z.string(), values: z.array(z.string()) }))
    .optional(),
});

export const getProjectOverviewStatsAsChunks = async (
  { queryContext, filters }: z.infer<typeof projectOverViewStatsInputParser>,
  onChunk: (x: Partial<ProjectOverviewStats>) => void
) => {
  const sendChunk =
    <T extends keyof ProjectOverviewStats>(key: T) =>
    (data: ProjectOverviewStats[typeof key]) => {
      onChunk({ [key]: data });
    };

  await Promise.all([
    // getWorkItemsOverview(queryContext).then(sendChunk('workItems')),

    getNewGraph({ queryContext, filters }).then(sendChunk('newWorkItems')),

    getVelocityGraph({ queryContext, filters }).then(sendChunk('velocityWorkItems')),

    getChangeLoadTimeGraph({ queryContext, filters }).then(sendChunk('cltWorkItems')),

    getFlowEfficiencyGraph({ queryContext, filters }).then(
      sendChunk('flowEfficiencyWorkItems')
    ),

    getCycleTimeGraph({ queryContext, filters }).then(sendChunk('cycleTimeWorkItems')),

    getWipGraph({ queryContext, filters }).then(sendChunk('wipTrendWorkItems')),
  ]);
};

export const getProjectOverviewStats = async ({
  queryContext,
  filters,
}: z.infer<typeof projectOverViewStatsInputParser>) => {
  let mergedChunks = {} as Partial<ProjectOverviewStats>;

  await getProjectOverviewStatsAsChunks({ queryContext, filters }, x => {
    mergedChunks = { ...mergedChunks, ...x };
  });

  return mergedChunks as ProjectOverviewStats;
};
