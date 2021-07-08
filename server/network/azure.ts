import { GitRepository } from 'azure-devops-node-api/interfaces/TfvcInterfaces';
import { Config } from '../types';
import createPaginatedGetter from './create-paginated-getter';
import { FetchResponse } from './fetch-with-disk-cache';

const apiVersion = { 'api-version': '5.1' };

const flattenToValues = <T>(xs: FetchResponse<ListOf<T>>[]) => xs.flatMap(x => x.data.value);
type ListOf<T> = { value: T[], count: number };

export default (config: Config) => {
  const authHeader = {
    Authorization: `Basic ${Buffer.from(`:${config.token}`).toString('base64')}`
  };
  const paginatedGet = createPaginatedGetter(config);
  const hasAnotherPage = <T>({ headers }: FetchResponse<T>) => (
    Boolean(headers['x-ms-continuationtoken'])
  );
  const url = (collectionName: string, projectName: string, path: string) => (
    `${config.host}${collectionName}/${projectName}/_apis${path}`
  );

  return {
    getRepositories: (collectionName: string, projectName: string) => (
      paginatedGet<ListOf<GitRepository>>({
        url: url(collectionName, projectName, '/git/repositories'),
        qsParams: () => apiVersion,
        hasAnotherPage,
        headers: () => authHeader,
        cacheFile: pageIndex => `${collectionName}_${projectName}_repositories_${pageIndex}`
      }).then(flattenToValues)
    )
  };
};
