import { z } from 'zod';
import type { Summary } from './mongoose-models/SummaryModel.js';
import { SummaryModel } from './mongoose-models/SummaryModel.js';

export const CollectionNameParser = z.object({
  collectionName: z.string(),
});
export const getCollectionTestAutomationSummary = ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) =>
  SummaryModel.find<
    Pick<
      Summary,
      | 'project'
      | 'totalActiveRepos'
      | 'totalRepos'
      | 'latestTestsSummary'
      | 'latestCoverageSummary'
      | 'weeklyTestsSummary'
      | 'weeklyCoverageSummary'
    >
  >(
    { collectionName, duration: '90 days' },
    {
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
  SummaryModel.find<
    Pick<
      Summary,
      | 'project'
      | 'masterOnly'
      | 'runCount'
      | 'branchPolicy'
      | 'startsWithArtifact'
      | 'pipelineCount'
    >
  >(
    { collectionName, duration: '90 days' },
    {
      project: 1,
      masterOnly: 1,
      runCount: 1,
      branchPolicy: 1,
      startsWithArtifact: 1,
      pipelineCount: 1,
    }
  );

export const getCollectionCodeQualitySummary = async ({
  collectionName,
}: z.infer<typeof CollectionNameParser>) =>
  SummaryModel.find<
    Pick<
      Summary,
      | 'project'
      | 'totalActiveRepos'
      | 'totalRepos'
      | 'healthyBranches'
      | 'reposWithSonarQube'
      | 'sonarProjects'
      | 'weeklyReposWithSonarQubeCount'
      | 'weeklySonarProjectsCount'
      | 'branchPolicy'
    >
  >(
    { collectionName, duration: '90 days' },
    {
      _id: 0,
      project: 1,
      totalActiveRepos: 1,
      totalRepos: 1,
      healthyBranches: 1,
      reposWithSonarQube: 1,
      sonarProjects: 1,
      weeklyReposWithSonarQubeCount: 1,
      weeklySonarProjectsCount: 1,
      branchPolicy: 1,
    }
  );
