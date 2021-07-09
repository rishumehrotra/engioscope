import fetch from 'node-fetch';
import qs from 'qs';
import { pipe, sort } from 'ramda';
import { CodeQuality, Config, Measure } from './types';
import { requiredMetrics } from './stats-aggregators/aggregate-code-quality';
import usingDiskCache from './using-disk-cache';
import { filter, getFirst } from './utils';

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

const getCurrentRepo = (repoName: string) => pipe(
  filter<SonarRepo>(repo => repo.name === repoName && Boolean(repo.lastAnalysisDate)),
  sort(sortByLastAnalysedDate),
  getFirst
);

const reposAtSonarServer = (pageIndex = 1) => async (sonarServer: Config['sonar'][number]): Promise<SonarRepo[]> => {
  const { url, token } = sonarServer;
  const sonarProjectsResponse = await fetch(`${url}/api/projects/search?p=${pageIndex}&ps=500`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}`
    }
  });
  const responseText = await sonarProjectsResponse.text();
  try {
    const parsed = JSON.parse(responseText) as { paging: SonarPaging, components: SonarRepo[] };
    return [
      ...parsed.components.map(component => ({ ...component, url })),
      ...(parsed.paging.pageSize === parsed.components.length ? await reposAtSonarServer(parsed.paging.pageIndex + 1)(sonarServer) : [])
    ];
  } catch (e) {
    console.error({ sonarServer, responseText, status: sonarProjectsResponse.status });
    throw e;
  }
};

export default (config: Config) => {
  const withDiskCache = usingDiskCache(config);

  const sonarRepos = withDiskCache(
    ['sonar'],
    () => Promise.all(config.sonar.map(reposAtSonarServer())).then(list => list.flat())
  );

  return async (project: string) => async (repoName: string): Promise<Measure[]> => {
    const currentSonarRepo = getCurrentRepo(repoName)(await sonarRepos);
    if (!currentSonarRepo) return [];

    return withDiskCache(
      ['sonar', project, repoName],
      async () => {
        const response = await fetch(`${currentSonarRepo.url}/api/measures/component?${qs.stringify({
          component: currentSonarRepo.key,
          metricKeys: requiredMetrics.join(',')
        })}`);

        return ((await response.json()).component as CodeQuality)?.measures || [];
      }
    );
  };
};
