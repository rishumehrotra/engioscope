import qs from 'qs';
import fetch from './fetch-with-timeout';
import { requiredMetrics } from '../stats-aggregators/code-quality';
import fetchWithDiskCache from './fetch-with-disk-cache';
import createPaginatedGetter from './create-paginated-getter';
import type { Measure, SonarAnalysisByRepo } from '../types-sonar';
import type { ParsedConfig, SonarConfig } from '../parse-config';

export type SonarRepo = {
  organization: string;
  id: string;
  key: string;
  name: string;
  qualifier: string;
  visibility: string;
  lastAnalysisDate: Date;
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

const attemptExactMatchFind = (repoName: string, sonarRepos: SonarRepo[]) => {
  const matchingRepos = sonarRepos
    .filter(repo => (
      normaliseRepoName(repo.name) === normaliseRepoName(repoName)
      && Boolean(repo.lastAnalysisDate)
    ))
    .sort(sortByLastAnalysedDate);

  return matchingRepos.length > 0 ? [matchingRepos[0]] : null;
};

const attemptStartsWithFind = (repoName: string, sonarRepos: SonarRepo[]) => {
  const matchingRepos = sonarRepos
    .filter(repo => (
      normaliseRepoName(repo.name).startsWith(normaliseRepoName(repoName))
      && Boolean(repo.lastAnalysisDate)
    ))
    .sort(sortByLastAnalysedDate);

  return matchingRepos.length > 0 ? matchingRepos : null;
};

const getCurrentRepo = (repoName: string, sonarRepos: SonarRepo[]) => {
  const exactMatch = attemptExactMatchFind(repoName, sonarRepos);
  return exactMatch || attemptStartsWithFind(repoName, sonarRepos);
};

type SonarSearchResponse = { paging: SonarPaging; components: SonarRepo[] };

const reposAtSonarServer = (paginatedGet: ReturnType<typeof createPaginatedGetter>) => (sonarServer: SonarConfig) => (
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

export default (config: ParsedConfig) => {
  const { usingDiskCache } = fetchWithDiskCache(config.cacheTimeMs);
  const paginatedGet = createPaginatedGetter(config.cacheTimeMs);

  const sonarRepos = Promise.all((config.sonar || []).map(reposAtSonarServer(paginatedGet)))
    .then(list => list.flat());

  return async (repoName: string): Promise<SonarAnalysisByRepo> => {
    const matchingSonarRepos = getCurrentRepo(repoName, await sonarRepos);
    if (!matchingSonarRepos) return null;

    return Promise.all(matchingSonarRepos.map(async sonarRepo => (
      usingDiskCache<{ component?: { measures: Measure[] }}>(
        ['sonar', sonarRepo.key],
        () => fetch(`${sonarRepo.url}/api/measures/component?${qs.stringify({
          component: sonarRepo.key,
          metricKeys: requiredMetrics.join(',')
        })}`, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${sonarRepo.token}:`).toString('base64')}`
          }
        })
      ).then(res => ({
        name: sonarRepo.name,
        url: `${sonarRepo.url}/dashboard?id=${sonarRepo.name}`,
        measures: res.data.component?.measures || [],
        lastAnalysisDate: sonarRepo.lastAnalysisDate
      }))
    )));
  };
};
