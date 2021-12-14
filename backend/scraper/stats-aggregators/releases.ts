import type { BranchPolicies, ReleasePipelineStats } from '../../../shared/types';
import type { Release } from '../types-azure';

const initialiseReleaseDetails = (release: Release): ReleasePipelineStats => ({
  id: release.releaseDefinition.id,
  name: release.releaseDefinition.name,
  url: release.releaseDefinition.url.replace('_apis/Release/definitions/', '_release?definitionId='),
  description: null,
  stages: release.environments
    .sort((a, b) => a.rank - b.rank)
    .map(env => ({
      id: env.id,
      name: env.name,
      conditions: env.conditions.map(cond => ({
        name: cond.name,
        type: cond.conditionType
      })),
      lastReleaseDate: new Date(0),
      releaseCount: 0,
      successCount: 0
    })),
  repos: {}
});

const addToReleaseStats = (
  releaseStats: ReleasePipelineStats,
  release: Release,
  policyConfigurationByRepoId: (repoId: string, branch: string) => BranchPolicies
): ReleasePipelineStats => ({
  ...releaseStats,
  stages: releaseStats.stages.map(stage => {
    const matchingStageInRelease = release.environments.find(e => e.name === stage.name);
    if (!matchingStageInRelease) return stage;
    if (matchingStageInRelease.status === 'notStarted') return stage;

    const releaseDate = matchingStageInRelease
      .deploySteps[matchingStageInRelease.deploySteps.length - 1]
      .lastModifiedOn;

    return {
      ...stage,
      lastReleaseDate: stage.lastReleaseDate > releaseDate ? stage.lastReleaseDate : releaseDate,
      releaseCount: stage.releaseCount + 1,
      successCount: stage.successCount + (matchingStageInRelease.status === 'succeeded' ? 1 : 0)
    };
  }),
  repos: release.artifacts.reduce((acc, artifact) => {
    const repoName = artifact.definitionReference.repository?.name;
    const repoId = artifact.definitionReference.repository?.id;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain
    const branch = artifact.definitionReference.branch?.name!;

    if (!repoName) return acc;

    acc[repoName] = acc[repoName] || [];
    if (acc[repoName].find(b => b.branch === branch)) return acc;

    acc[repoName].push({
      branch,
      policies: policyConfigurationByRepoId(repoId, branch)
    });
    return acc;
  }, releaseStats.repos)
});

export default (
  releases: Release[],
  policyConfigurationByRepoId: (repoId: string, branch: string) => BranchPolicies
) => (
  Object.values(releases.reduce<Record<number, ReleasePipelineStats>>((acc, release) => {
    acc[release.releaseDefinition.id] = addToReleaseStats(
      acc[release.releaseDefinition.id] || initialiseReleaseDetails(release),
      release,
      policyConfigurationByRepoId
    );
    return acc;
  }, {}))
);
