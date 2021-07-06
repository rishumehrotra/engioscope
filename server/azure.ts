import * as azdev from 'azure-devops-node-api';
import { PullRequestStatus } from 'azure-devops-node-api/interfaces/GitInterfaces';
import { EnvironmentStatus, Release, ReleaseExpands } from 'azure-devops-node-api/interfaces/ReleaseInterfaces';
import LRU from 'lru-cache';
import fetch from 'node-fetch';
import qs from 'qs';
import { Config } from './types';
import { pastDate } from './utils';
import usingDiskCache from './using-disk-cache';

const connectionCache = (config: Config) => {
  const collectionConnectionCache = new LRU<string, azdev.WebApi>(50);
  const authHandler = azdev.getPersonalAccessTokenHandler(config.token);

  return (collectionName: string) => {
    if (!collectionConnectionCache.has(collectionName)) {
      collectionConnectionCache.set(
        collectionName,
        new azdev.WebApi(config.host + collectionName, authHandler, {
          ignoreSslError: true,
          socketTimeout: 10 * 60000 // 7 minutes
        })
      );
    }

    // Disabled eslint rule here since previous line ensures that
    // this exists in the cache
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return collectionConnectionCache.get(collectionName)!;
  };
};

export default (config: Config) => {
  const getConnection = connectionCache(config);
  const gitApi = (collectionName: string) => getConnection(collectionName).getGitApi();
  const withDiskCache = usingDiskCache(config);

  // We have to fetch releases without using the SDK since the SDK doesn't support pagination
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchReleases = async (collectionName: string, projectName: string, continuationToken: string | null): Promise<any[]> => {
    const encode = encodeURIComponent;
    const url = `${config.host}${encode(collectionName)}/${encode(projectName)}/_apis/release/releases?${qs.stringify({
      'api-version': '5.0',
      minCreatedTime: pastDate(config.lookAtPast).toISOString(),
      $expand: ReleaseExpands.Environments + ReleaseExpands.Artifacts,
      ...(continuationToken ? { continuationToken } : undefined)
    })}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${config.token}`).toString('base64')}`
      }
    });

    const ct = response.headers.get('x-ms-continuationtoken');

    const json = await response.json();

    return [
      ...json.value,
      ...(json.count === 50 ? await fetchReleases(collectionName, projectName, ct) : [])
    ];
  };

  return {
    getRepositories: (collectionName: string, projectName: string) => withDiskCache(
      [collectionName, projectName, 'getRepositories'],
      () => gitApi(collectionName).then(g => g.getRepositories(projectName))
    ),

    getBuilds: async (collectionName: string, projectName: string) => withDiskCache(
      [collectionName, projectName, 'getBuilds'],
      async () => {
        // y u no named parameters?
        const buildAPI = await getConnection(collectionName).getBuildApi();
        const definitions = undefined; // number[]
        const queues = undefined; // number[]
        const buildNumber = undefined; // string
        const minTime = pastDate(config.lookAtPast); // Date
        const maxTime = undefined; // Date
        const requestedFor = undefined; // string
        const reasonFilter = undefined; // bi.BuildReason.All; // BuildInterfaces.BuildReason
        const statusFilter = undefined; // bi.BuildStatus.All; // BuildInterfaces.BuildStatus
        const resultFilter = undefined; // BuildInterfaces.BuildResult
        const tagFilters = undefined; // string[]
        const properties = undefined; // string[]
        const top = 5000; // number

        return buildAPI.getBuilds(
          projectName, definitions, queues, buildNumber,
          minTime, maxTime, requestedFor, reasonFilter,
          statusFilter, resultFilter, tagFilters, properties, top
        );
      }
    ),

    getPRs: async (collectionName: string, repoId: string) => withDiskCache(
      [collectionName, repoId, 'getPRs'],
      () => gitApi(collectionName)
        .then(g => g.getPullRequests(repoId, { status: PullRequestStatus.All }))
    ),

    getBranches: async (collectionName: string, repoId: string) => withDiskCache(
      [collectionName, repoId, 'getBranches'],
      () => gitApi(collectionName)
        .then(g => g.getBranches(repoId))
        .catch((e: Error) => {
          if (e.message.includes('VS403403')) return []; // Repo not initialised
          throw e;
        })
    ),

    getReleases: async (collectionName: string, projectName: string): Promise<Release[]> => withDiskCache(
      [collectionName, projectName, 'getReleases'],
      async () => {
        const releasesJson = await fetchReleases(collectionName, projectName, null);

        return releasesJson.map(release => ({
          artifacts: release.artifacts,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          environments: release.environments.map((environment: any) => ({
            name: environment.name,
            status: environment.status === 'succeeded' ? EnvironmentStatus.Succeeded : EnvironmentStatus.NotStarted,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            deploySteps: environment.deploySteps.map((deployStep: any) => ({
              lastModifiedOn: new Date(deployStep.lastModifiedOn)
            }))
          }))
        }));
      }
    ),

    getTestRuns: async (collectionName: string, projectName: string) => withDiskCache(
      [collectionName, projectName, 'getTestRuns'],
      async () => {
        const testApi = await getConnection(collectionName).getTestApi();
        return testApi.getTestRuns(
          projectName, undefined, undefined,
          undefined, undefined, true
        );
      }
    ),

    getTestCoverage: async (collectionName: string, projectName: string, buildId: number) => withDiskCache(
      [collectionName, projectName, buildId.toString(), 'getTestCoverage'],
      async () => {
        const testApi = await getConnection(collectionName).getTestApi();
        return testApi.getCodeCoverageSummary(projectName, buildId);
      }
    ),

    getCommits: async (collectionName: string, repoId: string) => withDiskCache(
      [collectionName, repoId, 'getCommits'],
      () => gitApi(collectionName)
        .then(g => g.getCommits(repoId, {
          fromDate: pastDate(config.lookAtPast).toISOString(),
          $top: 5000
        }))
    )
  };
};
