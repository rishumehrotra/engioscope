import {
  always, head, last, pipe, prop
} from 'rambda';
import { asc, byNum } from 'sort-lib';
import type { BranchPolicies, PipelineStage, ReleasePipelineStats } from '../../../shared/types.js';
import { exists } from '../../../shared/utils.js';
import type { ReleaseCondition, ReleaseDefinitionEnvironment } from '../../models/release-definitions.js';
import { isMaster, weeks } from '../../utils.js';
import type { ParsedProjectConfig } from '../parse-config.js';
import type { Release, EnvironmentStatus } from '../types-azure.js';

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
    reposAndBranches: Readonly<{ repoId: string; repoName: string; branchName: string }>[];
    progression: {
      name: string;
      date: Date;
      rank: number;
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
    return { repoName, repoId, branchName: branch! };
  }).filter(exists)
);

export const aggregateReleasesIntoPipelines = (releases: Release[]) => {
  const combinedReleases = releases.reduce<Record<number, PipelineDetails>>((acc, release) => {
    acc[release.releaseDefinition.id] = acc[release.releaseDefinition.id] || barePipeline(release);

    acc[release.releaseDefinition.id].attempts.push({
      id: release.id,
      name: release.name,
      reposAndBranches: getArtifactDetails(release),
      progression: release.environments
        .filter(env => env.status !== 'notStarted' && env.deploySteps?.length)
        .map(env => ({
          name: env.name,
          rank: env.rank,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          date: last(env.deploySteps)!.lastModifiedOn,
          state: env.status
        }))
        .filter(exists)
        .sort(asc(byNum(prop('rank'))))
    });

    acc[release.releaseDefinition.id].envs = release.environments
      .reduce<Record<string, EnvDetails>>((acc, env) => {
        if (!acc[env.name]) {
          acc[env.name] = {
            name: env.name,
            conditions: env.conditions.map(createCondition),
            rank: env.rank
          };
        } else if (!acc[env.name].conditions.length) {
          acc[env.name].conditions = env.conditions.map(createCondition);
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
        .sort(asc(byNum(prop('rank'))))
    };
  });
};

const didAttemptGoAheadUsing = (
  pipeline: ReturnType<typeof aggregateReleasesIntoPipelines>[number],
  ignoreStagesBefore: string
) => {
  const firstMatchingStage: EnvDetails | undefined = head(pipeline.envs.filter(
    env => env.name.toLowerCase().includes(ignoreStagesBefore.toLowerCase())
  ));

  if (!firstMatchingStage) return always(false);

  return (attempt: (typeof pipeline)['attempts'][number]) => {
    const lastProgression = last(attempt.progression);
    if (!lastProgression) return false;
    const attemptProgressionMaxRank = lastProgression.rank;
    return attemptProgressionMaxRank >= firstMatchingStage.rank;
  };
};

const getReposAndBranches = (
  pipeline: ReturnType<typeof aggregateReleasesIntoPipelines>[number],
  ignoreStagesBefore: string | undefined
) => {
  const didAttemptGoAhead = ignoreStagesBefore
    ? didAttemptGoAheadUsing(pipeline, ignoreStagesBefore)
    : always(true);

  const isAttemptIn = (week: (d: Date) => boolean) => (attempt: (typeof pipeline)['attempts'][number]) => {
    const lastProgression = last(attempt.progression);
    if (!lastProgression) return false;
    const attemptProgressionDate = lastProgression.date;
    return week(attemptProgressionDate);
  };

  const isAttemptFromMaster = (attempt: (typeof pipeline)['attempts'][number]) => {
    if (attempt.reposAndBranches.length === 0) return false;
    return attempt.reposAndBranches.every(pipe(prop('branchName'), isMaster));
  };

  const masterOnlyReleasesByWeek = weeks
    .map(week => pipeline.attempts.filter(isAttemptIn(week)))
    .map(attempts => (
      attempts.reduce((acc, attempt) => {
        acc.total += 1;
        acc.master += isAttemptFromMaster(attempt) ? 1 : 0;
        return acc;
      }, { total: 0, master: 0 })
    ));

  const { repos, stageInfo, attempts } = pipeline.attempts.reduce<{
    repos: Record<string, { name: string; branches: Set<string>; additionalBranches: Set<string> }>;
    stageInfo: Map<string, { successful: number; total: number }>;
    attempts: { total: number; master: number; byWeek: { total: number; master: number }[] };
  }>((acc, attempt) => {
    const attemptWentAhead = didAttemptGoAhead(attempt);

    attempt.reposAndBranches.forEach(({ repoId, repoName, branchName }) => {
      acc.repos[repoId] = acc.repos[repoId] || {
        name: repoName,
        branches: new Set(),
        additionalBranches: new Set()
      };

      if (attemptWentAhead) {
        acc.repos[repoId].branches.add(branchName);
        acc.repos[repoId].additionalBranches.delete(branchName);
      } else if (!acc.repos[repoId].branches.has(branchName)) {
        acc.repos[repoId].additionalBranches.add(branchName);
      }
    });

    attempt.progression.forEach(stage => {
      const stageInfo = acc.stageInfo.get(stage.name) || { successful: 0, total: 0 };

      stageInfo.total += 1;
      if (stage.state === 'succeeded') stageInfo.successful += 1;

      acc.stageInfo.set(stage.name, stageInfo);
    });

    if (attemptWentAhead) {
      acc.attempts.total += 1;
      if (isAttemptFromMaster(attempt)) acc.attempts.master += 1;
    }

    return acc;
  }, {
    repos: {},
    stageInfo: new Map(),
    attempts: { total: 0, master: 0, byWeek: masterOnlyReleasesByWeek }
  });

  return {
    repos: Object.entries(repos).reduce<Record<string, { name: string; branches: string[]; additionalBranches?: string[] }>>(
      (acc, [repoId, { name, branches, additionalBranches }]) => {
        acc[repoId] = {
          name,
          branches: [...branches],
          additionalBranches: additionalBranches.size > 0 ? [...additionalBranches] : undefined
        };
        return acc;
      },
      {}
    ),
    attempts,
    stageCounts: pipeline.envs
      .filter(({ name }) => stageInfo.has(name))
      .sort(asc(byNum(prop('rank'))))
      .map(stage => ({
        name: stage.name,
        successful: stageInfo.get(stage.name)?.successful || 0,
        total: stageInfo.get(stage.name)?.total || 0
      }))
  };
};

export default (
  projectConfig: ParsedProjectConfig,
  releases: Release[],
  policyConfigurationByRepoId: (repoId: string, branch: string) => BranchPolicies
): ReleasePipelineStats => {
  const { ignoreStagesBefore } = projectConfig.releasePipelines;
  const pipelines = aggregateReleasesIntoPipelines(releases)
    .map(pipeline => ({
      id: pipeline.definitionId,
      name: pipeline.name,
      url: pipeline.url,
      ...getReposAndBranches(pipeline, ignoreStagesBefore)
    }));

  const policies = pipelines.reduce<Record<string, Record<string, BranchPolicies>>>((acc, pipeline) => {
    Object.entries(pipeline.repos).forEach(([repoId, { branches, additionalBranches }]) => {
      [...branches, ...(additionalBranches || [])].forEach(branch => {
        acc[repoId] = acc[repoId] || {};
        acc[repoId][branch] = policyConfigurationByRepoId(repoId, branch);
      });
    });

    return acc;
  }, {});

  return { pipelines, policies };
};

export const formatReleaseDefinition = (environments: ReleaseDefinitionEnvironment[]): PipelineStage[] => (
  environments
    .sort(asc(byNum(prop('rank'))))
    .map(env => ({
      name: env.name,
      rank: env.rank,
      conditions: env.conditions.map(createCondition)
    }))
);
