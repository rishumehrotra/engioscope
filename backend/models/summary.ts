import { z } from 'zod';
import type { Summary } from './mongoose-models/SummaryModel.js';
import { SummaryModel } from './mongoose-models/SummaryModel.js';

export const CollectionNameParser = z.object({
  collectionName: z.string(),
});
export const getCollectionTestAutomationSummary = ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) =>
  SummaryModel.find<Summary>(
    { collectionName, duration: '90 days' },
    {
      collectionName: 1,
      project: 1,
      totalActiveRepos: 1,
      totalRepos: 1,
      latestTestsSummary: 1,
      latestCoverageSummary: 1,
      weeklyTestsSummary: 1,
      weeklyCoverageSummary: 1,
    }
  );

export const getCollectionBuildsSummary = ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) =>
  SummaryModel.find<
    Pick<
      Summary,
      | 'project'
      | 'totalActiveRepos'
      | 'totalRepos'
      | 'totalBuilds'
      | 'successfulBuilds'
      | 'centralTemplatePipeline'
      | 'pipelines'
    >
  >(
    { collectionName, duration: '90 days' },
    {
      project: 1,
      totalActiveRepos: 1,
      totalRepos: 1,
      totalBuilds: 1,
      successfulBuilds: 1,
      centralTemplatePipeline: 1,
      pipelines: 1,
    }
  );

export const getCollectionReleasesSummary = ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) =>
  SummaryModel.find<Summary>(
    { collectionName, duration: '90 days' },
    {
      collectionName: 1,
      project: 1,
      totalActiveRepos: 1,
      totalRepos: 1,
      hasReleasesReposCount: 1,
    }
  );

export const getCollectionCodeQualitySummary = async ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) =>
  SummaryModel.find<
    Pick<Summary, 'project' | 'totalActiveRepos' | 'totalRepos' | 'healthyBranches'>
  >(
    { collectionName, duration: '90 days' },
    {
      project: 1,
      totalActiveRepos: 1,
      totalRepos: 1,
      healthyBranches: 1,
    }
  );
