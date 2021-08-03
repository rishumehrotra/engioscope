import qs from 'qs';
import ms from 'ms';
import fetch from './fetch-with-timeout';
import { Config } from '../types';
import { chunkArray, pastDate } from '../../utils';
import {
  Build, CodeCoverageSummary, GitBranchStats, GitCommitRef, GitPullRequest,
  GitRepository, Release, ReleaseDefinition, TeamProjectReference, TestRun,
  WorkItem, WorkItemQueryHierarchialResult, WorkItemQueryResult, WorkItemRevision,
  WorkItemType, WorkItemTypeCategory
} from '../types-azure';
import createPaginatedGetter from './create-paginated-getter';
import fetchWithDiskCache, { FetchResponse } from './fetch-with-disk-cache';

const dayInMs = 24 * 60 * 60 * 1000;

const apiVersion = { 'api-version': '5.1' };

type ListOf<T> = { value: T[]; count: number };
const flattenToValues = <T>(xs: FetchResponse<ListOf<T>>[]) => xs.flatMap(x => x.data.value);

const hasAnotherPage = <T>({ headers }: FetchResponse<T>) => (
  Boolean(headers['x-ms-continuationtoken'])
);

const continuationToken = <T>(res: FetchResponse<T> | undefined): Record<string, never> | { continuationToken: string } => {
  if (!res) return {};

  const continuationToken = res.headers['x-ms-continuationtoken'];
  if (!continuationToken) return {};
  return { continuationToken };
};

export default (config: Config) => {
  const authHeader = {
    Authorization: `Basic ${Buffer.from(`:${config.azure.token}`).toString('base64')}`
  };
  const paginatedGet = createPaginatedGetter(ms(config.cacheToDiskFor));
  const { usingDiskCache, clearDiskCache } = fetchWithDiskCache(ms(config.cacheToDiskFor));
  const url = (collectionName: string, projectName: string, path: string) => (
    `${config.azure.host}${collectionName}/${projectName}/_apis${path}`
  );
  const list = <T>(
    { url, qsParams, cacheFile }:
    { url:string; qsParams?: Record<string, string>; cacheFile: string[] }
  ) => (
    paginatedGet<ListOf<T>>({
      url,
      qsParams: (_, prev) => ({ ...apiVersion, ...continuationToken(prev), ...qsParams }),
      hasAnotherPage,
      headers: () => authHeader,
      cacheFile: pageIndex => [...cacheFile.slice(0, -1), `${cacheFile[cacheFile.length - 1]}_${pageIndex}`]
    }).then(flattenToValues)
  );

  return {
    getProjects: (collectionName: string) => (
      list<TeamProjectReference>({
        url: `${config.azure.host}${collectionName}/_apis/projects`,
        cacheFile: [collectionName, 'projects']
      })
    ),

    getRepositories: (collectionName: string, projectName: string) => (
      list<GitRepository>({
        url: url(collectionName, projectName, '/git/repositories'),
        cacheFile: [collectionName, projectName, 'repositories']
      })
    ),

    getBuilds: (collectionName: string, projectName: string) => (
      list<Build>({
        url: url(collectionName, projectName, '/build/builds'),
        qsParams: {
          minTime: pastDate(config.azure.lookAtPast).toISOString(),
          resultFilter: 'succeeded,failed'
        },
        cacheFile: [collectionName, projectName, 'builds']
      })
    ),

    getPRs: (collectionName: string, projectName: string) => (
      paginatedGet<ListOf<GitPullRequest>>({
        url: url(collectionName, projectName, '/git/pullrequests'),
        qsParams: pageIndex => ({
          ...apiVersion,
          'searchCriteria.status': 'all',
          $top: '1000',
          ...(pageIndex === 0 ? {} : { $skip: (pageIndex * 1000).toString() })
        }),
        hasAnotherPage: previousResponse => previousResponse.data.count === 1000,
        headers: () => authHeader,
        cacheFile: pageIndex => [collectionName, projectName, `prs_${pageIndex}`]
      }).then(flattenToValues)
    ),

    getBranchesStats: (collectionName: string, projectName: string) => (repoId: string) => (
      list<GitBranchStats>({
        url: url(collectionName, projectName, `/git/repositories/${repoId}/stats/branches`),
        cacheFile: [collectionName, projectName, 'repos', repoId, 'branches']
      })
    ),

    getTestRuns: (collectionName: string, projectName: string) => (
      list<TestRun>({
        url: url(collectionName, projectName, '/test/runs'),
        qsParams: { includeRunDetails: 'true' },
        cacheFile: [collectionName, projectName, 'testruns']
      }).then(runs => runs.filter(run => run.startedDate > pastDate(config.azure.lookAtPast)))
    ),

    getTestCoverage: (collectionName: string, projectName: string) => (buildId: number) => (
      usingDiskCache<CodeCoverageSummary>(
        [collectionName, projectName, 'coverage', buildId.toString()],
        () => (
          fetch(url(collectionName, projectName, `/test/codecoverage?${qs.stringify({
            'api-version': '5.1-preview',
            buildId: buildId.toString()
          })}`), { headers: authHeader })
        )
      ).then(res => res.data)
    ),

    getReleaseDefinitions: (collectionName: string, projectName: string) => (
      list<ReleaseDefinition>({
        url: url(collectionName, projectName, '/release/definitions'),
        qsParams: { $expand: 'environments' },
        cacheFile: [collectionName, projectName, 'release_definitions']
      })
    ),

    getReleases: (collectionName: string, projectName: string) => (
      list<Release>({
        url: url(collectionName, projectName, '/release/releases'),
        qsParams: {
          minCreatedTime: pastDate(config.azure.lookAtPast).toISOString(),
          $expand: 'environments,artifacts'
        },
        cacheFile: [collectionName, projectName, 'releases']
      })
    ),

    getCommits: (collectionName: string, projectName: string) => (repoId: string) => (
      paginatedGet<ListOf<GitCommitRef>>({
        url: url(collectionName, projectName, `/git/repositories/${repoId}/commits`),
        qsParams: pageIndex => ({
          ...apiVersion,
          'searchCriteria.fromDate': pastDate(config.azure.lookAtPast).toISOString(),
          'searchCriteria.$top': '5000',
          'searchCriteria.includeUserImageUrl': 'true',
          ...(pageIndex === 0 ? {} : { $skip: (pageIndex * 1000).toString() })
        }),
        hasAnotherPage: previousResponse => previousResponse.data.count === 1000,
        headers: () => authHeader,
        cacheFile: pageIndex => [collectionName, projectName, 'repos', repoId, `commits_${pageIndex}`]
      }).then(flattenToValues)
    ),

    getWorkItemTypes: (collectionName: string, projectName: string) => (
      usingDiskCache<{count: number; value: WorkItemType[]}>(
        [collectionName, projectName, 'work-items', 'types'],
        () => (
          fetch(url(collectionName, projectName, `/wit/workitemtypes?${qs.stringify({
            'api-version': '5.1'
          })}`), { headers: authHeader })
        )
      ).then(res => res.data)
    ),

    getWorkItemTypeCategories: (collectionName: string, projectName: string) => (
      usingDiskCache<{count: number; value: WorkItemTypeCategory[]}>(
        [collectionName, projectName, 'work-items', 'type-categories'],
        () => (
          fetch(url(collectionName, projectName, `/wit/workitemtypecategories?${qs.stringify({
            'api-version': '5.1'
          })}`), { headers: authHeader })
        )
      ).then(res => res.data)
    ),

    getWorkItemIdsForType: (collectionName: string, projectName: string) => async (workItemType: string) => {
      const daysToLookup = Math.round((Date.now() - pastDate(config.azure.lookAtPast).getTime()) / dayInMs);
      const workItemIdsQuery = `
        SELECT [Id]
        FROM workitemLinks
        WHERE 
          [Source].[System.TeamProject] = @project
          AND [Source].[System.WorkItemType] = '${workItemType}'
          AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
          AND [Source].[System.ChangedDate] >= @today-${daysToLookup}
        ORDER BY [Source].[System.CreatedDate] ASC
        MODE (Recursive)
      `;

      const response = await usingDiskCache<WorkItemQueryResult<WorkItemQueryHierarchialResult>>(
        [collectionName, projectName, 'work-items', 'ids'],
        () => fetch(url(collectionName, projectName, `/wit/wiql?${qs.stringify({
          'api-version': '5.1'
        })}`), {
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          method: 'post',
          body: JSON.stringify({
            query: workItemIdsQuery
          })
        })
      );

      if (response.fromCache) {
        await clearDiskCache([collectionName, projectName, 'work-items', 'by-id']);
      }

      return response.data;
    },

    getWorkItems: (collectionName: string, projectName: string) => async (workItemIds: number[]) => {
      const workItemsById = (await Promise.all(chunkArray(workItemIds, 200)
        .map((chunk, index) => (
          usingDiskCache<{ count: number; value: WorkItem[] }>(
            [collectionName, projectName, 'work-items', 'by-id', String(index)],
            () => fetch(url(collectionName, projectName, `/wit/workitems/?${qs.stringify({
              'api-version': '5.1',
              ids: chunk.join(',')
            })}`), {
              headers: authHeader
            })
          ).then(res => res.data.value.reduce<Record<number, WorkItem>>((acc, wi) => ({
            ...acc,
            [wi.id]: wi
          }), {}))
        )))).reduce<Record<number, WorkItem>>((acc, chunk) => ({ ...acc, ...chunk }), {});

      return workItemIds.map(wid => workItemsById[wid]);
    },

    getWorkItemRevisions: (collectionName: string, projectName: string) => (workItemId: number) => (
      usingDiskCache<ListOf<WorkItemRevision>>(
        [collectionName, projectName, 'work-items', 'revisions', String(workItemId)],
        () => fetch(url(collectionName, projectName, `/wit/workitems/${workItemId}/revisions?${qs.stringify({
          'api-version': '5.1'
        })}`), {
          headers: authHeader
        })
      ).then(x => x.data.value)
    )
  };
};
