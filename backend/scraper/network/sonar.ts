import qs from 'qs';
import { pipe, sort } from 'rambda';
import ms from 'ms';
import fetch from './fetch-with-timeout';
import { requiredMetrics } from '../stats-aggregators/code-quality';
import { filter, getFirst } from '../../utils';
import fetchWithDiskCache from './fetch-with-disk-cache';
import createPaginatedGetter from './create-paginated-getter';
import { Config } from '../types';
import { Measure, SonarAnalysisByRepo } from '../types-sonar';

export type SonarRepo = {
  organization: string;
  id: string;
  key: string;
  name: string;
  qualifier: string;
  visibility: string;
  lastAnalysisDate: string;
  url: string;
  token: string;
};

type SonarPaging = {
  pageIndex: number;
  pageSize: number;
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

type SonarSearchResponse = { paging: SonarPaging; components: SonarRepo[] };

const reposAtSonarServer = (paginatedGet: ReturnType<typeof createPaginatedGetter>) => (sonarServer: Config['sonar'][number]) => (
  paginatedGet<SonarSearchResponse>({
    url: `${sonarServer.url}/api/projects/search`,
    cacheFile: pageIndex => ['sonar', 'projects', `${sonarServer.url.split('://')[1].replace(/\./g, '-')}-${pageIndex}`],
    headers: () => ({ Authorization: `Basic ${Buffer.from(`${sonarServer.token}:`).toString('base64')}` }),
    hasAnotherPage: previousResponse => previousResponse.data.paging.pageSize === previousResponse.data.components.length,
    qsParams: pageIndex => ({ ps: '500', p: (pageIndex + 1).toString() })
  })
    .then(responses => responses.map(response => response.data.components.map(c => ({
      ...c, url: sonarServer.url, token: sonarServer.token
    }))))
    .then(repos => repos.flat())
);

export default (config: Config) => {
  const { usingDiskCache } = fetchWithDiskCache(ms(config.cacheToDiskFor));
  const paginatedGet = createPaginatedGetter(ms(config.cacheToDiskFor));

  const sonarRepos = Promise.all(config.sonar.map(reposAtSonarServer(paginatedGet)))
    .then(list => list.flat());

  return async (repoName: string): Promise<SonarAnalysisByRepo> => {
    const currentSonarRepo = getCurrentRepo(repoName)(await sonarRepos);
    if (!currentSonarRepo) return null;

    return usingDiskCache<{ component?: { measures: Measure[] }}>(
      ['sonar', repoName],
      () => fetch(`${currentSonarRepo.url}/api/measures/component?${qs.stringify({
        component: currentSonarRepo.key,
        metricKeys: requiredMetrics.join(',')
      })}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${currentSonarRepo.token}:`).toString('base64')}`
        }
      })
    ).then(res => ({
      url: `${currentSonarRepo.url}/dashboard?id=${currentSonarRepo.name}`,
      measures: res.data.component?.measures || []
    }));
  };
};
