import type { z } from 'zod';
import { intersection, length, prop } from 'rambda';
import {
  getCentralTemplatePipeline,
  getYamlPipelinesCountSummary,
  type SummaryStats,
} from './repo-listing.js';
import type { filteredReposInputParser } from './active-repos.js';
import { getActiveRepos, searchAndFilterReposBy } from './active-repos.js';
import { getHealthyBranchesSummary } from './branches.js';
import {
  getActivePipelineIds,
  getWeeklyPipelinesWithTestsCount,
  getWeeklyPipelinesWithCoverageCount,
} from './build-definitions.js';
import { getSuccessfulBuildsBy, getTotalBuildsBy } from './build-listing.js';
import {
  getTotalCentralTemplateUsage,
  getActivePipelineCentralTemplateBuilds,
} from './build-reports.js';
import { getActivePipelineBuilds } from './builds.js';
import { getWeeklyPullRequestMerges } from './pull-requests.js';
import {
  usageByEnvironment,
  conformsToBranchPoliciesSummary,
  getReleasesSummaryForSse,
  getHasReleasesSummary,
  getReposConformingToBranchPolicies,
} from './release-listing.js';
import { getAllRepoDefaultBranchIDs } from './repos.js';
import {
  getSonarProjectsCount,
  updateWeeklySonarProjectCount,
  getReposWithSonarQube,
  updatedWeeklyReposWithSonarQubeCount,
} from './sonar.js';
import { getTestsAndCoveragesCount, getTestsAndCoverageByWeek } from './testruns.js';
import { fromContext } from './utils.js';
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

type ReleaseStats = {
  // pipelineCount: number;
  // startsWithArtifact: number;
  // runCount: number;
  // masterOnly: number;
  // ignoredStagesBefore?: string;
  // branchPolicy: {
  //   conforms: number;
  //   total: number;
  // };
  releases: Awaited<ReturnType<typeof getReleasesSummaryForSse>>;
  releasesBranchPolicy: Awaited<ReturnType<typeof conformsToBranchPoliciesSummary>>;
  usageByEnv: Awaited<ReturnType<typeof usageByEnvironment>>;
};
export type ProjectOverviewStats = SummaryStats & WorkItemStats & ReleaseStats;

export const getProjectOverviewStatsAsChunks = async (
  { queryContext }: z.infer<typeof filteredReposInputParser>,
  onChunk: (x: Partial<ProjectOverviewStats>) => void
) => {
  const sendChunk =
    <T extends keyof ProjectOverviewStats>(key: T) =>
    (data: ProjectOverviewStats[typeof key]) => {
      onChunk({ [key]: data });
    };

  const { collectionName, project } = fromContext(queryContext);

  const activeRepos = await getActiveRepos(queryContext);

  const activeRepoIds = activeRepos.map(prop('id'));
  const activeRepoNames = activeRepos.map(prop('name'));

  sendChunk('totalActiveRepos')(activeRepoIds.length);

  const defaultBranchIDs = await getAllRepoDefaultBranchIDs(
    collectionName,
    project,
    activeRepoIds
  );

  const activePipelineIdsPromise = getActivePipelineIds(queryContext, activeRepoIds);
  const centralTemplatePipelinePromise = getCentralTemplatePipeline(
    queryContext,
    activeRepoIds,
    activeRepoNames
  );

  const activePipelineWithCentralTemplateCountPromise = Promise.all([
    activePipelineIdsPromise,
    centralTemplatePipelinePromise,
  ]).then(([activePipelineIds, centralTemplatePipeline]) => {
    return intersection(
      activePipelineIds,
      centralTemplatePipeline.idsWithMainBranchBuilds
    ).length;
  });

  await Promise.all([
    getSuccessfulBuildsBy(queryContext, activeRepoIds).then(
      sendChunk('successfulBuilds')
    ),
    getTotalBuildsBy(queryContext, activeRepoIds).then(sendChunk('totalBuilds')),
    getTotalCentralTemplateUsage(queryContext, activeRepoNames).then(
      sendChunk('centralTemplateUsage')
    ),
    getYamlPipelinesCountSummary(queryContext, activeRepoIds).then(
      sendChunk('pipelines')
    ),
    getWeeklyPipelinesWithTestsCount(queryContext, activeRepoIds).then(
      sendChunk('weeklyPipelinesWithTestsCount')
    ),
    getWeeklyPipelinesWithCoverageCount(queryContext, activeRepoIds).then(
      sendChunk('weeklyPipelinesWithCoverageCount')
    ),
    getHealthyBranchesSummary(queryContext, activeRepoIds, defaultBranchIDs).then(
      sendChunk('healthyBranches')
    ),
    getHasReleasesSummary(queryContext, activeRepoIds).then(
      sendChunk('hasReleasesReposCount')
    ),
    centralTemplatePipelinePromise
      .then(x => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { idsWithMainBranchBuilds, ...rest } = x;
        return rest;
      })
      .then(sendChunk('centralTemplatePipeline')),
    getTestsAndCoveragesCount(queryContext, activeRepoIds).then(sendChunk('defSummary')),
    getTestsAndCoverageByWeek(queryContext, activeRepoIds).then(
      ({ testsByWeek, coveragesByWeek }) => {
        sendChunk('weeklyTestsSummary')(testsByWeek);
        sendChunk('weeklyCoverageSummary')(coveragesByWeek);
      }
    ),
    searchAndFilterReposBy({ queryContext }).then(x => sendChunk('totalRepos')(x.length)),
    getSonarProjectsCount(collectionName, project, activeRepoIds).then(
      sendChunk('sonarProjects')
    ),
    updateWeeklySonarProjectCount(queryContext, activeRepoIds).then(
      sendChunk('weeklySonarProjectsCount')
    ),
    getReposWithSonarQube(collectionName, project, activeRepoIds).then(
      sendChunk('reposWithSonarQube')
    ),
    updatedWeeklyReposWithSonarQubeCount(queryContext, activeRepoIds).then(
      sendChunk('weeklyReposWithSonarQubeCount')
    ),
    getReposConformingToBranchPolicies(queryContext, activeRepoIds).then(
      sendChunk('branchPolicies')
    ),
    activePipelineIdsPromise.then(length).then(sendChunk('activePipelinesCount')),
    getActivePipelineCentralTemplateBuilds(
      queryContext,
      activeRepoNames,
      activeRepoIds
    ).then(sendChunk('activePipelineCentralTemplateBuilds')),
    getActivePipelineBuilds(queryContext, activeRepoIds).then(
      sendChunk('activePipelineBuilds')
    ),
    activePipelineWithCentralTemplateCountPromise.then(
      sendChunk('activePipelineWithCentralTemplateCount')
    ),
    getWeeklyPullRequestMerges(queryContext, activeRepoIds).then(
      sendChunk('pullRequestMerges')
    ),

    // getWorkItemsOverview(queryContext).then(sendChunk('workItems')),

    getNewGraph({ queryContext }).then(sendChunk('newWorkItems')),

    getVelocityGraph({ queryContext }).then(sendChunk('velocityWorkItems')),

    getChangeLoadTimeGraph({ queryContext }).then(sendChunk('cltWorkItems')),

    getFlowEfficiencyGraph({ queryContext }).then(sendChunk('flowEfficiencyWorkItems')),

    getCycleTimeGraph({ queryContext }).then(sendChunk('cycleTimeWorkItems')),

    getWipGraph({ queryContext }).then(sendChunk('wipTrendWorkItems')),

    getReleasesSummaryForSse(queryContext).then(sendChunk('releases')),

    conformsToBranchPoliciesSummary({ queryContext }).then(
      sendChunk('releasesBranchPolicy')
    ),

    usageByEnvironment({ queryContext }).then(sendChunk('usageByEnv')),
  ]);
};

export const getProjectOverviewStats = async (
  filterArgs: z.infer<typeof filteredReposInputParser>
) => {
  let mergedChunks = {} as Partial<ProjectOverviewStats>;

  await getProjectOverviewStatsAsChunks(filterArgs, x => {
    mergedChunks = { ...mergedChunks, ...x };
  });

  return mergedChunks as ProjectOverviewStats;
};
