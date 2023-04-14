import { z } from 'zod';
import type { Summary } from './mongoose-models/SummaryModel.js';
import { SummaryModel } from './mongoose-models/SummaryModel.js';

export const CollectionNameParser = z.object({
  collectionName: z.string(),
});

export const getCollectionSummary = async ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) => {
  const collectionSummary = await SummaryModel.find<Summary>({ collectionName });

  return collectionSummary;
};

export const getCollectionTestAutomationSummary = async ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) => {
  const collectionSummary = await SummaryModel.find<Summary>(
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

  return collectionSummary;
};

export const getCollectionBuildsSummary = async ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) => {
  const collectionSummary = await SummaryModel.find<Summary>(
    { collectionName, duration: '90 days' },
    {
      collectionName: 1,
      project: 1,
      totalActiveRepos: 1,
      totalRepos: 1,
      weeklySuccessfulBuilds: 1,
      totalBuilds: 1,
      successfulBuilds: 1,
      centralTemplatePipeline: 1,
      pipelines: 1,
    }
  );

  return collectionSummary;
};

export const getCollectionReleasesSummary = async ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) => {
  const collectionSummary = await SummaryModel.find<Summary>(
    { collectionName, duration: '90 days' },
    {
      collectionName: 1,
      project: 1,
      totalActiveRepos: 1,
      totalRepos: 1,
      hasReleasesReposCount: 1,
    }
  );

  return collectionSummary;
};

export const getCollectionCodeQualitySummary = async ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) => {
  const collectionSummary = await SummaryModel.find<Summary>(
    { collectionName, duration: '90 days' },
    {
      collectionName: 1,
      project: 1,
      totalActiveRepos: 1,
      totalRepos: 1,
      healthyBranches: 1,
    }
  );

  return collectionSummary;
};
