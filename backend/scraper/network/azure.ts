import qs from 'qs';
import md5 from 'md5';
import { filter } from 'rambda';
import fetch from './fetch-with-extras.js';
import { chunkArray, pastDate } from '../../utils.js';
import type {
  Build,
  BuildDefinitionReference,
  CodeCoverageSummary,
  GitBranchStats,
  GitCommitRef,
  GitPullRequest,
  GitRepository,
  PolicyConfiguration,
  Release,
  ReleaseDefinition,
  TeamProjectReference,
  TestCaseResult,
  TestRun,
  TestRun2,
  Timeline,
  WorkItem,
  WorkItemField,
  WorkItemQueryFlatResult,
  WorkItemQueryHierarchialResult,
  WorkItemQueryResult,
  WorkItemRevision,
  WorkItemType,
  WorkItemTypeCategory,
  WorkItemWithRelations,
} from '../types-azure.js';
import createPaginatedGetter from './create-paginated-getter.js';
import type { FetchResponse } from './fetch-with-disk-cache.js';
import fetchWithDiskCache from './fetch-with-disk-cache.js';
import type { ParsedConfig } from '../parse-config.js';
import createChunkedPaginatedGetter from './create-chunked-paginated-getter.js';
import { is404 } from './http-error.js';
import { oneHourInMs } from '../../../shared/utils.js';

const apiVersion = { 'api-version': '5.1' };

type ListOf<T> = { value: T[]; count: number };
const flattenToValues = <T>(xs: FetchResponse<ListOf<T>>[]) =>
  xs.flatMap(x => x.data.value);

const responseHasContinuationToken = <T>({ headers }: FetchResponse<T>) =>
  Boolean(headers['x-ms-continuationtoken']);

const continuationToken = <T>(
  res: FetchResponse<T> | undefined
): Record<string, never> | { continuationToken: string } => {
  if (!res) return {};

  const continuationToken = res.headers['x-ms-continuationtoken'];
  if (!continuationToken) return {};
  return { continuationToken };
};

export default (config: ParsedConfig) => {
  const authHeader = {
    Authorization: `Basic ${Buffer.from(`:${config.azure.token}`).toString('base64')}`,
  };
  const otherFetchParams = {
    verifySsl: config.azure.verifySsl,
  };
  const paginatedGet = createPaginatedGetter(config.cacheTimeMs, config.azure.verifySsl);
  const chunkedPaginatedGet = createChunkedPaginatedGetter(
    config.cacheTimeMs,
    config.azure.verifySsl
  );
  const { usingDiskCache, clearDiskCache } = fetchWithDiskCache(config.cacheTimeMs);
  const url = (collectionName: string, projectName: string | null, path: string) =>
    `${config.azure.host}${collectionName}/${
      projectName === null ? '' : `${projectName}/`
    }_apis${path}`;

  const list = <T>({
    url,
    qsParams,
    cacheFile,
  }: {
    url: string;
    qsParams?: Record<string, string>;
    cacheFile: string[];
  }) =>
    paginatedGet<ListOf<T>>({
      url,
      qsParams: (_, prev) => ({ ...apiVersion, ...continuationToken(prev), ...qsParams }),
      hasAnotherPage: responseHasContinuationToken,
      headers: () => authHeader,
      cacheFile: pageIndex => [
        ...cacheFile.slice(0, -1),
        `${cacheFile[cacheFile.length - 1]}_${pageIndex}`,
      ],
    }).then(flattenToValues);

  const chunkedList = <T>({
    url,
    qsParams,
    cacheFile,
    chunkHandler,
  }: {
    url: string;
    qsParams?: Record<string, string>;
    cacheFile: string[];
    chunkHandler: (x: T[]) => Promise<unknown>;
  }) =>
    chunkedPaginatedGet<ListOf<T>>({
      url,
      qsParams: (_, prev) => ({ ...apiVersion, ...continuationToken(prev), ...qsParams }),
      hasAnotherPage: responseHasContinuationToken,
      headers: () => authHeader,
      cacheFile: pageIndex => [
        ...cacheFile.slice(0, -1),
        `${cacheFile[cacheFile.length - 1]}_${pageIndex}`,
      ],
      chunkHandler: x => chunkHandler(x.data.value),
    });

  return {
    getCollections: () =>
      list<{ id: string; name: string; url: string }>({
        url: `${config.azure.host}/_apis/projectCollections?$top=1000`,
        cacheFile: ['collections'],
      }),

    getProjects: (collectionName: string) =>
      list<TeamProjectReference>({
        url: `${config.azure.host}${collectionName}/_apis/projects`,
        cacheFile: [collectionName, 'projects'],
      }),

    getRepositories: (collectionName: string, projectName: string) =>
      list<GitRepository>({
        url: url(collectionName, projectName, '/git/repositories'),
        cacheFile: [collectionName, projectName, 'repositories'],
      }),

    getBuilds: (collectionName: string, projectName: string) => {
      // Gosh, this one turned out to be crazy. There's something up
      // with this API. The continuationToken thing seems utterly broken.
      // If we hit the limit of 5000 results, any form of pagination seems broken.
      // So, we're taking the tack of querying per week, with the hope that
      // there wouldn't be 5000 builds run per project per week. Fingers crossed.

      const weeks: Date[] = [];
      let currentDate = new Date();

      while (currentDate >= config.azure.queryFrom) {
        weeks.push(currentDate);
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() - 7);
      }
      weeks.push(config.azure.queryFrom);

      return Promise.all(
        weeks.slice(1).map((weekStart, index) =>
          usingDiskCache<ListOf<Build>>(
            [collectionName, projectName, `builds_${index}`],
            () =>
              fetch(
                url(
                  collectionName,
                  projectName,
                  `/build/builds?${qs.stringify({
                    ...apiVersion,
                    $top: 5000,
                    maxTime: weeks[index].toISOString(),
                    minTime: weekStart.toISOString(),
                  })}`
                ),
                { headers: authHeader, ...otherFetchParams }
              )
          )
        )
      ).then(flattenToValues);
    },

    getBuildsSince: (collectionName: string, projectName: string) => (since: Date) => {
      // Gosh, this one turned out to be crazy. There's something up
      // with this API. The continuationToken thing seems utterly broken.
      // If we hit the limit of 5000 results, any form of pagination seems broken.
      // So, we're taking the tack of querying per week, with the hope that
      // there wouldn't be 5000 builds run per project per week. Fingers crossed.

      const weeks: Date[] = [];
      let currentDate = new Date();

      while (currentDate >= since) {
        weeks.push(currentDate);
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() - 7);
      }
      weeks.push(since);

      return Promise.all(
        weeks.slice(1).map((weekStart, index) =>
          usingDiskCache<ListOf<Build>>(
            [collectionName, projectName, `builds_${index}`],
            () =>
              fetch(
                url(
                  collectionName,
                  projectName,
                  `/build/builds?${qs.stringify({
                    ...apiVersion,
                    $top: 5000,
                    maxTime: weeks[index].toISOString(),
                    minTime: weekStart.toISOString(),
                  })}`
                ),
                { headers: authHeader, ...otherFetchParams }
              )
          )
        )
      ).then(flattenToValues);
    },

    getBuildsAsChunksSince: (
      collectionName: string,
      projectName: string,
      since: Date,
      chunkHandler: (x: Build[]) => Promise<unknown>
    ) => {
      // Gosh, this one turned out to be crazy. There's something up
      // with this API. The continuationToken thing seems utterly broken.
      // If we hit the limit of 5000 results, any form of pagination seems broken.
      // So, we're taking the tack of querying per week, with the hope that
      // there wouldn't be 5000 builds run per project per week. Fingers crossed.

      const weeks: Date[] = [];
      let currentDate = new Date();

      while (currentDate >= since) {
        weeks.push(currentDate);
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() - 7);
      }
      weeks.push(since);

      return Promise.all(
        weeks.slice(1).map((weekStart, index) =>
          usingDiskCache<ListOf<Build>>(
            [collectionName, projectName, `builds_${index}`],
            () =>
              fetch(
                url(
                  collectionName,
                  projectName,
                  `/build/builds?${qs.stringify({
                    ...apiVersion,
                    $top: 5000,
                    maxTime: weeks[index].toISOString(),
                    minTime: weekStart.toISOString(),
                    deletedFilter: 'includeDeleted',
                  })}`
                ),
                { headers: authHeader, ...otherFetchParams }
              )
          ).then(result => chunkHandler(result.data.value))
        )
      );
    },

    getOneBuildBeforeQueryPeriod:
      (collectionName: string, projectName: string) => (buildDefinitionIds: number[]) =>
        Promise.all(
          chunkArray(buildDefinitionIds, 100).map((buildDefinitionIdsChunk, index) =>
            list<Build>({
              url: url(collectionName, projectName, '/build/builds'),
              qsParams: {
                maxTime: config.azure.queryFrom.toISOString(),
                resultFilter: 'succeeded,failed,partiallySucceeded',
                maxBuildsPerDefinition: '1',
                definitions: buildDefinitionIdsChunk.join(','),
                branchName: 'master',
              },
              cacheFile: [collectionName, projectName, `older-builds_${index}`],
            })
          )
        ).then(x => x.flat()),

    getBuildDefinitions: (collectionName: string, projectName: string) =>
      list<BuildDefinitionReference>({
        url: url(collectionName, projectName, '/build/definitions'),
        qsParams: {
          includeLatestBuilds: 'true',
          includeAllProperties: 'true',
        },
        cacheFile: [collectionName, projectName, 'build-definitions'],
      }),

    getBuildTimeline:
      (collectionName: string, projectName: string) => (buildId: number) =>
        usingDiskCache<Timeline | null>(
          [collectionName, projectName, 'timeline', buildId.toString()],
          () =>
            fetch(
              url(
                collectionName,
                projectName,
                `/build/builds/${buildId}/timeline?${qs.stringify(apiVersion)}`
              ),
              { headers: authHeader, ...otherFetchParams }
            )
        ).then(res => res.data),

    getPRs: (collectionName: string, projectName: string) =>
      paginatedGet<ListOf<GitPullRequest>>({
        url: url(collectionName, projectName, '/git/pullrequests'),
        qsParams: pageIndex => ({
          ...apiVersion,
          'searchCriteria.status': 'all',
          '$top': '1000',
          ...(pageIndex === 0 ? {} : { $skip: (pageIndex * 1000).toString() }),
        }),
        hasAnotherPage: previousResponse => previousResponse.data.count === 1000,
        headers: () => authHeader,
        cacheFile: pageIndex => [collectionName, projectName, `prs_${pageIndex}`],
      }).then(flattenToValues),

    getPRsAsChunks: async (
      collectionName: string,
      projectName: string,
      chunkHandler: (x: GitPullRequest[]) => Promise<unknown>
    ) => {
      const pageSize = 1000;

      return chunkedPaginatedGet<ListOf<GitPullRequest>>({
        url: url(collectionName, projectName, `/git/pullrequests`),
        qsParams: pageIndex => ({
          ...apiVersion,
          'searchCriteria.status': 'all',
          '$top': String(pageSize),
          ...(pageIndex === 0 ? {} : { $skip: (pageIndex * pageSize).toString() }),
        }),
        hasAnotherPage: previousResponse => previousResponse.data.count === pageSize,
        headers: () => authHeader,
        cacheFile: pageIndex => [collectionName, projectName, `prs_${pageIndex}`],
        chunkHandler: chunk => chunkHandler(chunk.data.value),
      });
    },

    getBranchesStats: (collectionName: string, projectName: string) => (repoId: string) =>
      list<GitBranchStats>({
        url: url(
          collectionName,
          projectName,
          `/git/repositories/${repoId}/stats/branches`
        ),
        cacheFile: [collectionName, projectName, 'repos', repoId, 'branches'],
      }).catch(error => {
        if (error instanceof Error && error.message.includes('404')) return [];
        throw error;
      }),

    getTestRuns:
      (collectionName: string, projectName: string) =>
      ({ uri: buildUri }: Pick<Build, 'uri'>) =>
        list<TestRun>({
          url: url(collectionName, projectName, '/test/runs'),
          qsParams: { includeRunDetails: 'true', buildUri },

          cacheFile: [
            collectionName,
            projectName,
            'testruns',
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            buildUri.split('/').pop()!,
          ],
        }).then(runs => runs.filter(run => !run.release)),

    getTestRunsAsChunksSince: (
      collectionName: string,
      projectName: string,
      since_: Date,
      chunkHandler: (x: TestRun2[]) => Promise<unknown>
    ) => {
      const weeks: Date[] = [];
      let currentDate = new Date();

      // Azure Devops sets the lastUpdatedDate incorrectly to somewhere just after createdDate,
      // and not after completedDate. So, we're giving an hour's buffer in the start, assuming
      // tests should not take longer than an hour.
      const since = new Date(since_);
      since.setTime(since.getTime() - oneHourInMs);

      while (currentDate >= since) {
        weeks.push(currentDate);
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() - 7);
      }
      weeks.push(since);

      return weeks.slice(1).reduce<Promise<unknown>>(async (acc, weekStart, index) => {
        await acc;

        await chunkedList<TestRun2>({
          url: url(collectionName, projectName, '/test/runs'),
          qsParams: {
            // ADO barfs if we have a Z at the end of the time string
            maxLastUpdatedDate: weeks[index].toISOString().replace('Z', ''),
            minLastUpdatedDate: weekStart.toISOString().replace('Z', ''),
            $top: '100',
            includeRunDetails: 'true',
            isAutomated: 'true',
            state: 'completed',
          },
          cacheFile: [
            collectionName,
            projectName,
            'test-runs',
            weekStart.toISOString().split('T')[0],
          ],
          chunkHandler,
        });
      }, Promise.resolve());
    },

    getTestRunsByReleaseDefnIdAndBranch:
      (collectionName: string, projectName: string) =>
      (
        since: Date,
        releaseDefIds: number,
        branchName: string,
        buildDefnIds?: number,
        envDefnIds?: number[]
      ) => {
        const weeks: Date[] = [];
        let currentDate = new Date();

        while (currentDate >= since) {
          weeks.push(currentDate);
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() - 7);
        }

        return Promise.all(
          weeks.map((weekStart, index) => {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);

            return list<TestRun>({
              url: url(collectionName, projectName, '/test/runs'),
              qsParams: {
                releaseDefIds: String(releaseDefIds),
                branchName,
                ...(buildDefnIds ? { buildDefIds: String(buildDefnIds) } : {}),
                ...(envDefnIds ? { releaseEnvDefIds: envDefnIds.join(',') } : {}),
                minLastUpdatedDate: weekStart.toISOString(),
                maxLastUpdatedDate: weekEnd.toISOString(),
              },
              cacheFile: [
                collectionName,
                projectName,
                'testruns-temp',
                `${String(releaseDefIds)}_${index}`,
              ],
            });
          })
        ).then(x => x.flat());
      },

    getTestRunResults: (collectionName: string, projectName: string) => (runId: number) =>
      list<TestCaseResult>({
        url: url(collectionName, projectName, `/test/runs/${runId}/results`),
        cacheFile: [collectionName, projectName, 'testruns', 'results', String(runId)],
      }),

    getTestCoverage: (collectionName: string, projectName: string) => (buildId: number) =>
      usingDiskCache<CodeCoverageSummary>(
        [collectionName, projectName, 'coverage', buildId.toString()],
        () =>
          fetch(
            url(
              collectionName,
              projectName,
              `/test/codecoverage?${qs.stringify({
                'api-version': '5.1-preview',
                'buildId': buildId.toString(),
              })}`
            ),
            { headers: authHeader, ...otherFetchParams }
          )
      ).then(res => res.data),

    getReleaseDefinitions: (collectionName: string, projectName: string) =>
      list<ReleaseDefinition>({
        url: url(collectionName, projectName, '/release/definitions'),
        qsParams: { $expand: 'environments' },
        cacheFile: [collectionName, projectName, 'release_definitions'],
      }),

    getReleaseDefinitionsAsChunks: (
      collectionName: string,
      projectName: string,
      chunkHandler: (x: ReleaseDefinition[]) => Promise<unknown>
    ) =>
      chunkedList<ReleaseDefinition>({
        url: url(collectionName, projectName, '/release/definitions'),
        qsParams: { $expand: 'environments' },
        cacheFile: [collectionName, projectName, 'release_definitions'],
        chunkHandler,
      }),

    getReleaseDefinition: (
      collectionName: string,
      projectName: string,
      definitionId: number
    ) =>
      usingDiskCache<ReleaseDefinition>(
        [collectionName, projectName, 'release_definitions', definitionId.toString()],
        () =>
          fetch(
            url(
              collectionName,
              projectName,
              `/release/definitions/${definitionId}?${qs.stringify({
                'api-version': '5.1-preview',
              })}`
            ),
            { headers: authHeader, ...otherFetchParams }
          )
      ).then(res => res.data),

    getRelease: (collectionName: string, project: string, releaseId: number) => {
      return usingDiskCache<Release>(
        [collectionName, project, 'release', releaseId.toString()],
        () =>
          fetch(
            url(
              collectionName,
              project,
              `/release/releases/${releaseId}?${qs.stringify({
                'api-version': '5.1-preview',
              })}`
            ),
            {
              headers: authHeader,
              ...otherFetchParams,
            }
          )
      ).then(res => res.data);
    },

    getReleases: (
      collectionName: string,
      projectName: string,
      releaseIds?: number[],
      queryFrom = new Date(config.azure.queryFrom)
    ) => {
      // Taking back the querying time by a month due to #55.
      const q = new Date(queryFrom);
      q.setMonth(q.getMonth() - 1);

      return list<Release>({
        url: url(collectionName, projectName, '/release/releases'),
        qsParams: {
          minCreatedTime: q.toISOString(),
          $expand: 'environments,artifacts',
          ...(releaseIds ? { releaseIdFilter: releaseIds.join(',') } : {}),
        },
        cacheFile: [
          collectionName,
          projectName,
          'releases',
          md5(releaseIds?.join(',') || 'no-release-ids'),
        ],
      }).then(
        filter(release =>
          release.environments.some(env =>
            env.deploySteps.some(step => step.queuedOn >= queryFrom)
          )
        )
      );
    },

    getReleasesAsChunks: (
      collectionName: string,
      projectName: string,
      queryFrom: Date,
      chunkHandler: (x: Release[]) => Promise<unknown>
    ) =>
      chunkedList<Release>({
        url: url(collectionName, projectName, '/release/releases'),
        qsParams: {
          minCreatedTime: queryFrom.toISOString(),
          $expand: 'environments,artifacts',
        },
        cacheFile: [collectionName, projectName, 'releases'],
        chunkHandler,
      }),

    getReleasesForReleaseIdsAsChunks: (
      collectionName: string,
      projectName: string,
      releaseIds: number[],
      chunkHandler: (x: Release[]) => Promise<unknown>
    ) =>
      chunkedList<Release>({
        url: url(collectionName, projectName, '/release/releases'),
        qsParams: {
          $expand: 'environments,artifacts',
          releaseIdFilter: releaseIds.join(','),
        },
        cacheFile: [
          collectionName,
          projectName,
          'releases-by-id',
          md5(releaseIds.join(',')),
        ],
        chunkHandler,
      }),

    getCommits: (collectionName: string, projectName: string) => (repoId: string) =>
      paginatedGet<ListOf<GitCommitRef>>({
        url: url(collectionName, projectName, `/git/repositories/${repoId}/commits`),
        qsParams: pageIndex => ({
          ...apiVersion,
          'searchCriteria.fromDate': config.azure.queryFrom.toISOString(),
          'searchCriteria.$top': '5000',
          'searchCriteria.includeUserImageUrl': 'true',
          ...(pageIndex === 0 ? {} : { $skip: (pageIndex * 5000).toString() }),
        }),
        hasAnotherPage: previousResponse => previousResponse.data.count === 1000,
        headers: () => authHeader,
        cacheFile: pageIndex => [
          collectionName,
          projectName,
          'repos',
          repoId,
          `commits_${pageIndex}`,
        ],
      })
        .then(flattenToValues)
        .catch(error => {
          if (error instanceof Error && error.message.includes('404')) return [];
          throw error;
        }),

    getCommitsAsChunksSince: async (
      collectionName: string,
      projectName: string,
      repoId: string,
      commitId: string | undefined,
      chunkHandler: (x: GitCommitRef[]) => Promise<unknown>
    ) => {
      const pageSize = 1000;

      return chunkedPaginatedGet<ListOf<GitCommitRef>>({
        url: url(collectionName, projectName, `/git/repositories/${repoId}/commits`),
        qsParams: pageIndex => ({
          ...apiVersion,
          'searchCriteria.$top': String(pageSize),
          'searchCriteria.includeUserImageUrl': 'true',
          ...(commitId
            ? { 'searchCriteria.fromCommitId': commitId }
            : { 'searchCriteria.fromDate': pastDate('1y').toISOString() }),
          ...(pageIndex === 0
            ? {}
            : { 'searchCriteria.$skip': (pageIndex * pageSize).toString() }),
        }),
        hasAnotherPage: previousResponse => previousResponse.data.count === pageSize,
        headers: () => authHeader,
        cacheFile: pageIndex => [
          collectionName,
          projectName,
          'repos',
          repoId,
          `commits_${pageIndex}`,
        ],
        chunkHandler: chunk => chunkHandler(chunk.data.value),
      }).catch(error => {
        if (is404(error)) return [];
        throw error;
      });
    },

    getWorkItemTypes: (collectionName: string, projectName: string) =>
      usingDiskCache<{ count: number; value: WorkItemType[] }>(
        [collectionName, projectName, 'work-items', 'types'],
        () =>
          fetch(
            url(
              collectionName,
              projectName,
              `/wit/workitemtypes?${qs.stringify(apiVersion)}`
            ),
            { headers: authHeader, ...otherFetchParams }
          )
      ).then(res => res.data.value),

    getWorkItemTypeCategories: (collectionName: string, projectName: string) =>
      usingDiskCache<{ count: number; value: WorkItemTypeCategory[] }>(
        [collectionName, projectName, 'work-items', 'type-categories'],
        () =>
          fetch(
            url(
              collectionName,
              projectName,
              `/wit/workitemtypecategories?${qs.stringify(apiVersion)}`
            ),
            { headers: authHeader, ...otherFetchParams }
          )
      ).then(res => res.data.value),

    getProjectWorkItemIdsForQuery:
      (collectionName: string, projectName: string) =>
      <
        T extends
          | WorkItemQueryResult<WorkItemQueryHierarchialResult>
          | WorkItemQueryResult<WorkItemQueryFlatResult>
      >(
        query: string
      ) =>
        usingDiskCache<T>(
          [collectionName, projectName, 'work-items', 'queries', `query_${md5(query)}`],
          () =>
            fetch(
              url(collectionName, projectName, `/wit/wiql?${qs.stringify(apiVersion)}`),
              {
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                method: 'post',
                body: JSON.stringify({ query }),
                ...otherFetchParams,
              }
            )
        ).then(res => res.data),

    getCollectionWorkItemIdsForQuery: <
      T extends
        | WorkItemQueryResult<WorkItemQueryHierarchialResult>
        | WorkItemQueryResult<WorkItemQueryFlatResult>
    >(
      // TODO: Remove the `usePreciseTime` arg (set it to true) once moved over completely to the DB
      collectionName: string,
      query: string,
      queryName: string,
      usePreciseTime?: boolean
    ) =>
      usingDiskCache<T>(
        [collectionName, 'work-items', 'work-items', `ids_${md5(query)}`],
        () =>
          fetch(
            url(
              collectionName,
              null,
              `/wit/wiql?${qs.stringify({
                ...apiVersion,
                timePrecision: usePreciseTime || false,
              })}`
            ),
            {
              headers: { ...authHeader, 'Content-Type': 'application/json' },
              method: 'post',
              body: JSON.stringify({ query }),
              ...otherFetchParams,
            }
          )
      ).then(async res => {
        if (!res.fromCache) {
          await clearDiskCache([collectionName, 'work-items', 'by-id', queryName]);
        }
        return res.data as T;
      }),

    getCollectionWorkItems: async (
      collectionName: string,
      workItemIds: number[],
      queryName: string
    ) => {
      const workItemsById = (
        await Promise.all(
          chunkArray(workItemIds, 200).map((chunk, index) =>
            usingDiskCache<{ count: number; value: WorkItem[] }>(
              [collectionName, 'work-items', 'by-id', queryName, String(index)],
              () =>
                fetch(
                  url(
                    collectionName,
                    null,
                    `/wit/workitems/?${qs.stringify({
                      ...apiVersion,
                      ids: chunk.join(','),
                    })}`
                  ),
                  { headers: authHeader, ...otherFetchParams }
                )
            ).then(res =>
              res.data.value.reduce<Record<number, WorkItem>>((acc, wi) => {
                acc[wi.id] = wi;
                return acc;
              }, {})
            )
          )
        )
      ).reduce<Record<number, WorkItem>>((acc, chunk) => Object.assign(acc, chunk), {});

      return workItemIds.map(wid => workItemsById[wid]);
    },

    getCollectionWorkItemsAndRelationsChunks: (
      collectionName: string,
      workItemIds: number[],
      queryName: string
    ) =>
      chunkArray(workItemIds, 200).map((chunk, index) =>
        usingDiskCache<{ count: number; value: WorkItemWithRelations[] }>(
          [collectionName, 'work-items', 'by-id', queryName, String(index)],
          () =>
            fetch(
              url(
                collectionName,
                null,
                `/wit/workitems/?${qs.stringify({
                  ...apiVersion,
                  $expand: 'all',
                  ids: chunk.join(','),
                })}`
              ),
              { headers: authHeader, ...otherFetchParams }
            )
        ).then(res => res.data.value)
      ),

    getCollectionWorkItemFields: (collectionName: string) =>
      usingDiskCache<{ count: number; value: WorkItemField[] }>(
        [collectionName, 'work-items', 'fields'],
        () =>
          fetch(url(collectionName, null, `/wit/fields?${qs.stringify(apiVersion)}`), {
            headers: authHeader,
            ...otherFetchParams,
          })
      ).then(res => res.data.value),

    getWorkItemRevisions: (collectionName: string) => (workItemId: number) =>
      usingDiskCache<ListOf<WorkItemRevision>>(
        [collectionName, 'work-items', 'revisions', String(workItemId)],
        () =>
          fetch(
            url(
              collectionName,
              null,
              `/wit/workitems/${workItemId}/revisions?${qs.stringify(apiVersion)}`
            ),
            { headers: authHeader, ...otherFetchParams }
          )
      ).then(x => x.data.value),

    getPolicyConfigurations: (collectionName: string, projectName: string) =>
      list<PolicyConfiguration>({
        url: url(collectionName, projectName, '/policy/configurations'),
        cacheFile: [collectionName, projectName, 'policy-configurations'],
      }),
  };
};
