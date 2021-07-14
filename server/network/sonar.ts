import fetch from 'node-fetch';
import qs from 'qs';
import { pipe, sort } from 'ramda';
import { Config, Measure } from '../types';
import { requiredMetrics } from '../stats-aggregators/aggregate-code-quality';
import { filter, getFirst } from '../utils';
import fetchWithDiskCache from './fetch-with-disk-cache';
import createPaginatedGetter from './create-paginated-getter';

export type SonarRepo = {
  organization: string,
  id: string,
  key: string,
  name: string,
  qualifier: string,
  visibility: string,
  lastAnalysisDate: string,
  url: string
};

type SonarPaging = {
  pageIndex: number,
  pageSize: number
};

const sortByLastAnalysedDate = (a: SonarRepo, b: SonarRepo) => (
  new Date(b.lastAnalysisDate).getTime() - new Date(a.lastAnalysisDate).getTime()
);

const normaliseRepoName = (name: string) => (
  name.replace(/-/g, '_').toLowerCase()
);

const getCurrentRepo = (repoName: string) => pipe(
  filter<SonarRepo>(repo => (
    normaliseRepoName(repo.name) === normaliseRepoName(repoName)
      && Boolean(repo.lastAnalysisDate)
  )),
  sort(sortByLastAnalysedDate),
  getFirst
);

type SonarSearchResponse = { paging: SonarPaging, components: SonarRepo[] };

const reposAtSonarServer = (paginatedGet: ReturnType<typeof createPaginatedGetter>) => (sonarServer: Config['sonar'][number]) => (
  paginatedGet<SonarSearchResponse>({
    url: `${sonarServer.url}/api/projects/search`,
    cacheFile: pageIndex => `sonar-${sonarServer.url.split('://')[1].replace(/\./g, '-')}-projects-${pageIndex}`,
    headers: () => ({ Authroization: `Basic ${Buffer.from(`${sonarServer.token}:`).toString('base64')}` }),
    hasAnotherPage: previousResponse => previousResponse.data.paging.pageSize === previousResponse.data.components.length,
    qsParams: pageIndex => ({ ps: '500', p: (pageIndex + 1).toString() })
  })
    .then(responses => responses.map(response => response.data.components.map(c => ({ ...c, url: sonarServer.url }))))
    .then(repos => repos.flat())
);

export default (config: Config) => {
  const getWithCache = fetchWithDiskCache(config);
  const paginatedGet = createPaginatedGetter(config);

  const sonarRepos = Promise.all(config.sonar.map(reposAtSonarServer(paginatedGet)))
    .then(list => list.flat());

  return async (repoName: string): Promise<Measure[]> => {
    const currentSonarRepo = getCurrentRepo(repoName)(await sonarRepos);
    if (!currentSonarRepo) return [];

    return getWithCache<{ component?: { measures: Measure[] }}>(
      `sonar_${repoName}`,
      () => fetch(`${currentSonarRepo.url}/api/measures/component?${qs.stringify({
        component: currentSonarRepo.key,
        metricKeys: requiredMetrics.join(',')
      })}`)
    ).then(res => res.data.component?.measures || []);
  };
};
