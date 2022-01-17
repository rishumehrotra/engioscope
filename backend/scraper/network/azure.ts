import qs from 'qs';
import md5 from 'md5';
import { filter } from 'rambda';
import fetch from './fetch-with-timeout';
import { chunkArray } from '../../utils';
import type {
  Build, CodeCoverageSummary, GitBranchStats, GitCommitRef, GitPullRequest,
  GitRepository, PolicyConfiguration, Release, ReleaseDefinition, TeamProjectReference, TestRun,
  WorkItem, WorkItemField, WorkItemQueryFlatResult, WorkItemQueryHierarchialResult,
  WorkItemQueryResult, WorkItemRevision, WorkItemType, WorkItemTypeCategory
} from '../types-azure';
import createPaginatedGetter from './create-paginated-getter';
import type { FetchResponse } from './fetch-with-disk-cache';
import fetchWithDiskCache from './fetch-with-disk-cache';
import type { ParsedConfig } from '../parse-config';

const apiVersion = { 'api-version': '5.1' };

type ListOf<T> = { value: T[]; count: number };
const flattenToValues = <T>(xs: FetchResponse<ListOf<T>>[]) => xs.flatMap(x => x.data.value);

const responseHasContinuationToken = <T>({ headers }: FetchResponse<T>) => (
  Boolean(headers['x-ms-continuationtoken'])
);

const continuationToken = <T>(res: FetchResponse<T> | undefined): Record<string, never> | { continuationToken: string } => {
  if (!res) return {};

  const continuationToken = res.headers['x-ms-continuationtoken'];
  if (!continuationToken) return {};
  return { continuationToken };
};

export default (config: ParsedConfig) => {
  const authHeader = {
    Authorization: `Basic ${Buffer.from(`:${config.azure.token}`).toString('base64')}`
  };
  const paginatedGet = createPaginatedGetter(config.cacheTimeMs);
  const { usingDiskCache, clearDiskCache } = fetchWithDiskCache(config.cacheTimeMs);
  const url = (collectionName: string, projectName: string | null, path: string) => (
    `${config.azure.host}${collectionName}/${projectName === null ? '' : `${projectName}/`}_apis${path}`
  );
  const list = <T>(
    { url, qsParams, cacheFile }:
    { url: string; qsParams?: Record<string, string>; cacheFile: string[] }
  ) => (
    paginatedGet<ListOf<T>>({
      url,
      qsParams: (_, prev) => ({ ...apiVersion, ...continuationToken(prev), ...qsParams }),
      hasAnotherPage: responseHasContinuationToken,
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
          minTime: config.azure.queryFrom.toISOString(),
          resultFilter: 'succeeded,failed',
          $top: '5000'
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
          '$top': '1000',
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

    getTestRuns: (collectionName: string, projectName: string) => ({ uri: buildUri }: Pick<Build, 'uri'>) => (
      list<TestRun>({
        url: url(collectionName, projectName, '/test/runs'),
        qsParams: { includeRunDetails: 'true', buildUri },
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        cacheFile: [collectionName, projectName, 'testruns', buildUri.split('/').pop()!]
      })
    ),

    getTestCoverage: (collectionName: string, projectName: string) => (buildId: number) => (
      usingDiskCache<CodeCoverageSummary>(
        [collectionName, projectName, 'coverage', buildId.toString()],
        () => fetch(
          url(collectionName, projectName, `/test/codecoverage?${qs.stringify({
            'api-version': '5.1-preview',
            'buildId': buildId.toString()
          })}`),
          { headers: authHeader }
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

    getReleaseDefinition: (collectionName: string, projectName: string, definitionId: number) => (
      usingDiskCache<ReleaseDefinition>(
        [collectionName, projectName, 'release_definitions', definitionId.toString()],
        () => fetch(
          url(collectionName, projectName, `/release/definitions/${definitionId}?${qs.stringify({
            'api-version': '5.1-preview'
          })}`),
          { headers: authHeader }
        )
      ).then(res => res.data)
    ),

    getReleases: (collectionName: string, projectName: string) => {
      // Taking back the querying time by a month due to #55.
      const queryFrom = new Date(config.azure.queryFrom);
      queryFrom.setMonth(queryFrom.getMonth() - 1);

      return list<Release>({
        url: url(collectionName, projectName, '/release/releases'),
        qsParams: {
          minCreatedTime: queryFrom.toISOString(),
          $expand: 'environments,artifacts'
        },
        cacheFile: [collectionName, projectName, 'releases']
      }).then(filter(release => (
        release.environments.some(
          env => env.deploySteps.some(
            step => step.queuedOn >= config.azure.queryFrom
          )
        )
      )));
    },

    getCommits: (collectionName: string, projectName: string) => (repoId: string) => (
      paginatedGet<ListOf<GitCommitRef>>({
        url: url(collectionName, projectName, `/git/repositories/${repoId}/commits`),
        qsParams: pageIndex => ({
          ...apiVersion,
          'searchCriteria.fromDate': config.azure.queryFrom.toISOString(),
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
        () => fetch(
          url(collectionName, projectName, `/wit/workitemtypes?${qs.stringify(apiVersion)}`),
          { headers: authHeader }
        )
      ).then(res => res.data.value)
    ),

    getWorkItemTypeCategories: (collectionName: string, projectName: string) => (
      usingDiskCache<{count: number; value: WorkItemTypeCategory[]}>(
        [collectionName, projectName, 'work-items', 'type-categories'],
        () => fetch(
          url(collectionName, projectName, `/wit/workitemtypecategories?${qs.stringify(apiVersion)}`),
          { headers: authHeader }
        )
      ).then(res => res.data.value)
    ),

    getProjectWorkItemIdsForQuery: (collectionName: string, projectName: string) => (
      <T extends WorkItemQueryResult<WorkItemQueryHierarchialResult> | WorkItemQueryResult<WorkItemQueryFlatResult>>(
        query: string
      ) => (
        usingDiskCache<T>(
          [collectionName, projectName, 'work-items', 'queries', `query_${md5(query)}`],
          () => fetch(
            url(collectionName, projectName, `/wit/wiql?${qs.stringify(apiVersion)}`),
            {
              headers: { ...authHeader, 'Content-Type': 'application/json' },
              method: 'post',
              body: JSON.stringify({ query })
            }
          )
        ).then(res => res.data)
      )
    ),

    getCollectionWorkItemIdsForQuery:
      <T extends WorkItemQueryResult<WorkItemQueryHierarchialResult> | WorkItemQueryResult<WorkItemQueryFlatResult>>(
        collectionName: string, query: string
      ) => (
        usingDiskCache<T>(
          [collectionName, 'work-items', 'work-items', `ids_${md5(query)}`],
          () => fetch(
            url(collectionName, null, `/wit/wiql?${qs.stringify(apiVersion)}`),
            {
              headers: { ...authHeader, 'Content-Type': 'application/json' },
              method: 'post',
              body: JSON.stringify({ query })
            }
          )
        ).then(async res => {
          if (res.fromCache) {
            await clearDiskCache([collectionName, 'work-items', 'by-id']);
          }
          return res.data as T;
        })
      ),

    getCollectionWorkItems: async (collectionName: string, workItemIds: number[]) => {
      const workItemsById = (await Promise.all(chunkArray(workItemIds, 200)
        .map((chunk, index) => (
          usingDiskCache<{ count: number; value: WorkItem[] }>(
            [collectionName, 'work-items', 'by-id', String(index)],
            () => fetch(
              url(collectionName, null, `/wit/workitems/?${qs.stringify({
                ...apiVersion,
                ids: chunk.join(',')
              })}`),
              { headers: authHeader }
            )
          ).then(res => res.data.value.reduce<Record<number, WorkItem>>((acc, wi) => {
            acc[wi.id] = wi;
            return acc;
          }, {}))
        )))).reduce<Record<number, WorkItem>>((acc, chunk) => Object.assign(acc, chunk), {});

      return workItemIds.map(wid => workItemsById[wid]);
    },

    getCollectionWorkItemFields: (collectionName: string) => (
      usingDiskCache<{count: number; value: WorkItemField[]}>(
        [collectionName, 'work-items', 'fields'],
        () => fetch(
          url(collectionName, null, `/wit/fields?${qs.stringify(apiVersion)}`),
          { headers: authHeader }
        )
      ).then(res => res.data.value)
    ),

    getWorkItemRevisions: (collectionName: string) => (workItemId: number) => (
      usingDiskCache<ListOf<WorkItemRevision>>(
        [collectionName, 'work-items', 'revisions', String(workItemId)],
        () => fetch(
          url(collectionName, null, `/wit/workitems/${workItemId}/revisions?${qs.stringify(apiVersion)}`),
          { headers: authHeader }
        )
      ).then(x => x.data.value)
    ),

    getPolicyConfigurations: (collectionName: string, projectName: string) => (
      list<PolicyConfiguration>({
        url: url(collectionName, projectName, '/policy/configurations'),
        cacheFile: [collectionName, projectName, 'policy-configurations']
      })
    )
  };
};
