import { last, omit } from 'rambda';
import type { BranchPolicies, ReleasePipelineStats } from '../../../shared/types';
import { exists } from '../../utils';
import type {
  Release, ReleaseCondition, EnvironmentStatus
} from '../types-azure';

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
      lastReleaseDate: new Date(0),
      releaseCount: 0,
      successCount: 0
    })),
  repos: {}
});

type InternalReleasePipelineStats = Omit<ReleasePipelineStats, 'repos'> & {
  repos: Record<string, {
    branch: string;
    policies: BranchPolicies;
    farthestStage: string;
    farthestStageRank: number;
  }[]>;
};

const addToReleaseStats = (
  releaseStats: InternalReleasePipelineStats,
  release: Release,
  policyConfigurationByRepoId: (repoId: string, branch: string) => BranchPolicies
): InternalReleasePipelineStats => ({
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

    const farthestStage = [...release.environments].reverse()
      .find(e => e.status === 'succeeded');

    if (!farthestStage) return acc;

    const existingBranch = acc[repoName].find(b => b.branch === branch);
    if (existingBranch) {
      if (existingBranch.farthestStageRank < farthestStage.rank) {
        existingBranch.farthestStage = farthestStage.name;
        existingBranch.farthestStageRank = farthestStage.rank;
      }
    } else {
      acc[repoName].push({
        branch,
        policies: policyConfigurationByRepoId(repoId, branch),
        farthestStage: farthestStage.name,
        farthestStageRank: farthestStage.rank
      });
    }

    return acc;
  }, releaseStats.repos)
});

const createCondition = (condition: ReleaseCondition) => ({
  type: condition.conditionType,
  name: condition.name
});

type EnvDetails = {
  name: string;
  conditions: {
    type: ReleaseCondition['conditionType'];
    name: string;
  }[];
  rank: number;
};

type PipelineDetails = {
  definitionId: number;
  name: string;
  url: string;
  envs: Record<number, EnvDetails>;
  attempts: {
    id: number;
    name: string;
    reposAndBranches: Readonly<[string, string]>[];
    progression: {
      env: string;
      date: Date;
      state: EnvironmentStatus;
    }[];
  }[];
};

const barePipeline = (release: Release): PipelineDetails => ({
  definitionId: release.releaseDefinition.id,
  name: release.releaseDefinition.name,
  url: release.releaseDefinition.url.replace('_apis/Release/definitions/', '_release?definitionId='),
  envs: {},
  attempts: []
});

const getArtifactDetails = (release: Release) => (
  release.artifacts.map(artifact => {
    const repoName = artifact.definitionReference.repository?.name;
    const repoId = artifact.definitionReference.repository?.id;
    const branch = artifact.definitionReference.branch?.name;
    if (!repoName) return;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return { repoName, repoId, branch: branch! } as const;
  }).filter(exists)
);

export const aggregateReleases = (releases: Release[]) => {
  const combinedReleases = releases.reduce<Record<number, PipelineDetails>>((acc, release) => {
    acc[release.releaseDefinition.id] = acc[release.releaseDefinition.id] || barePipeline(release);

    acc[release.releaseDefinition.id].attempts.push({
      id: release.id,
      name: release.name,
      reposAndBranches: getArtifactDetails(release)
        .reduce<[string, string][]>((acc, { repoName, branch }) => {
          acc.push([repoName, branch]);
          return acc;
        }, []),
      progression: release.environments
        .filter(env => env.status !== 'notStarted')
        .map(env => ({
          env: env.name,
          date: last(env.deploySteps).lastModifiedOn,
          state: env.status
        }))
        .filter(exists)
    });

    acc[release.releaseDefinition.id].envs = release.environments
      .reduce<Record<number, EnvDetails>>((acc, env) => {
        if (!acc[env.rank]) {
          acc[env.rank] = {
            name: env.name,
            conditions: env.conditions.map(createCondition),
            rank: env.rank
          };
        } else if (!acc[env.rank].conditions.length) {
          acc[env.rank].conditions = env.conditions.map(createCondition);
        }

        return acc;
      }, acc[release.releaseDefinition.id].envs);

    return acc;
  }, {});

  return Object.values(combinedReleases).map(release => {
    const { envs, ...rest } = release;

    return {
      ...rest,
      envs: Object.values(envs)
        .sort((a, b) => a.rank - b.rank)
    };
  });
};

export default (
  releases: Release[],
  policyConfigurationByRepoId: (repoId: string, branch: string) => BranchPolicies
): ReleasePipelineStats[] => {
  // console.log(JSON.stringify(aggregateReleases(releases), null, 2));

  const internalReleaseStats = Object.values(releases.reduce<Record<number, InternalReleasePipelineStats>>((acc, release) => {
    acc[release.releaseDefinition.id] = addToReleaseStats(
      acc[release.releaseDefinition.id] || initialiseReleaseDetails(release),
      release,
      policyConfigurationByRepoId
    );
    return acc;
  }, {}));

  return internalReleaseStats.map(release => ({
    ...release,
    repos: Object.entries(release.repos)
      .reduce<ReleasePipelineStats['repos']>((acc, [repoName, repos]) => {
        acc[repoName] = repos.map(omit(['farthestStageRank']));
        return acc;
      }, {})
  }));
};
