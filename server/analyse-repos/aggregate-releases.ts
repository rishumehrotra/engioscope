/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { EnvironmentStatus, Release, ReleaseEnvironment } from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import { ChildIndicator, TopLevelIndicator } from '../../shared-types';
import ratingConfig from '../rating-config';
import { shortDateFormat, isMaster } from '../utils';
import { withOverallRating } from './ratings';

type EnvironmentStats = {
  lastDeploymentDate: Date,
  count: number,
  successful: number,
  fromMaster: number
};
type EnvironmentStatsWithoutMasterCount = Omit<EnvironmentStats, 'fromMaster'>;

type EnvironmentName = 'sit' | 'pp' | 'prod' | 'other';
type ReleaseStats = Record<EnvironmentName, EnvironmentStats>;

type RepoId = string;
type ReleaseStatsByRepo = Record<RepoId, ReleaseStats>;

const indicatorsForEnvironment = (
  envName: Uppercase<EnvironmentName>,
  environmentStats?: EnvironmentStats
): ChildIndicator[] => {
  const totalDeployments = environmentStats ? environmentStats.count : 0;
  const successfulDeploymentRate = (environmentStats && environmentStats.count !== 0)
    ? (environmentStats.successful * 100) / environmentStats.count
    : 0;
  const nonMasterDeployments = environmentStats
    ? environmentStats.count - environmentStats.fromMaster
    : 0;

  return [
    {
      name: `Last deployment date (${envName})`,
      value: environmentStats ? shortDateFormat(environmentStats.lastDeploymentDate) : 'never',
      rating: ratingConfig.releases.lastDeploymentDate
    },
    {
      name: `Total deployments (${envName})`,
      value: totalDeployments,
      rating: ratingConfig.releases.totalDeployments(totalDeployments)
    },
    {
      name: `Successful deployment rate (${envName})`,
      value: `${Math.round(successfulDeploymentRate)}%`,
      rating: ratingConfig.releases.successfulDeploymentRate(successfulDeploymentRate)
    },
    {
      name: `Non master deployments (${envName})`,
      value: nonMasterDeployments,
      rating: ratingConfig.releases.nonMasterDeployments(nonMasterDeployments)
    }
  ];
};

const topLevelIndicator = (releaseStats?: ReleaseStats): TopLevelIndicator => withOverallRating({
  name: 'Releases',
  count: (releaseStats?.sit?.count || 0) + (releaseStats?.pp?.count || 0) + (releaseStats?.prod?.count || 0),
  indicators: [
    ...indicatorsForEnvironment('SIT', releaseStats?.sit),
    ...indicatorsForEnvironment('PP', releaseStats?.pp),
    ...indicatorsForEnvironment('PROD', releaseStats?.prod)
  ]
});

const environmentName = (environment: ReleaseEnvironment): EnvironmentName => {
  if (environment.name?.toLowerCase() === 'prod') return 'prod';
  if (['pp', 'replica', 'preprod', 'pre-prod'].includes((environment.name ?? '').toLowerCase())) return 'pp';
  if (environment.name?.toLowerCase() === 'sit') return 'sit';
  return 'other';
};

const reposAndBranches = (release: Release) => release.artifacts!
  .filter(artifact => (
    artifact.definitionReference?.repository && artifact.definitionReference?.branch
  ))
  .reduce((acc, artifact) => {
    const repoId = artifact.definitionReference?.repository?.id;
    const branchName = artifact.definitionReference?.branch.name!;
    // Assumption: Even if multiple artifacts are generated from a repo,
    // they'll still be from the same branch.
    if (repoId) acc[repoId] = branchName;
    return acc;
  }, {} as Record<RepoId, string>);

const lastDeploymentDate = (environment: ReleaseEnvironment) => new Date(
  Math.max(...environment.deploySteps!.map(
    step => step.lastModifiedOn!.getTime()
  ))
);

const combineEnvironmentStats = (...environmentStats: (EnvironmentStats | undefined)[]) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  environmentStats.reduce((acc, envStats) => {
    if (!acc) return envStats;
    if (!envStats) return acc;

    return {
      count: acc.count + envStats.count,
      fromMaster: acc.fromMaster + envStats.fromMaster,
      successful: acc.successful + envStats.successful,
      lastDeploymentDate: acc.lastDeploymentDate > envStats.lastDeploymentDate
        ? acc.lastDeploymentDate
        : envStats.lastDeploymentDate
    };
  }, undefined);

const smooshItAllTogether = (
  repos: ReleaseStatsByRepo,
  repoDetails: ReturnType<typeof reposAndBranches>,
  environmentBasedStats: Record<EnvironmentName, EnvironmentStatsWithoutMasterCount>
): ReleaseStatsByRepo => Object.entries(repoDetails)
  .reduce((acc, [repoId, branchName]) => ({
    ...acc,
    [repoId]: Object.entries(environmentBasedStats).reduce((acc, [envName, envStat]) => ({
      ...acc,
      [envName]: combineEnvironmentStats(
        { ...envStat, fromMaster: isMaster(branchName) ? 1 : 0 },
        acc[envName as EnvironmentName]
        // repos[repoId]?.[envName as EnvironmentName]
      )
    }), acc[repoId] || {})
  }), repos);

const hasDeploySteps = (environment: ReleaseEnvironment) => environment.deploySteps!.length > 0;

export default (releases: Release[]) => {
  const aggregated = releases.reduce<ReleaseStatsByRepo>((acc, release) => {
    const environmentBasedStats = release.environments!
      .filter(hasDeploySteps)
      .reduce((acc, environment) => ({
        ...acc,
        // Assumption: A release will only hit an environment once.
        // This logic might break if a release is re-run.
        // (This won't break if a separate release is triggered.)
        [environmentName(environment)]: {
          lastDeploymentDate: lastDeploymentDate(environment),
          count: 1,
          successful: environment.status === EnvironmentStatus.Succeeded ? 1 : 0
        }
      }), {} as Record<EnvironmentName, EnvironmentStatsWithoutMasterCount>);

    return {
      ...acc,
      ...smooshItAllTogether(acc, reposAndBranches(release), environmentBasedStats)
    };
  }, {});

  return (repoId: string) => topLevelIndicator(aggregated[repoId]);
};
