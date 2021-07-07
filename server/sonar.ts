import fetch from 'node-fetch';
import qs from 'qs';
import { pipe, sort } from 'ramda';
import { CodeQuality, Config, Measure } from './types';
import { requiredMetrics } from './analyse-repos/aggregate-code-quality';
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
  new Date(a.lastAnalysisDate).getTime() - new Date(b.lastAnalysisDate).getTime()
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
      Authorization: `Basic ${token}`
    }
  });
  const parsed = await sonarProjectsResponse.json() as { paging: SonarPaging, components: SonarRepo[] };
  return [
    ...parsed.components.map(component => ({ ...component, url })),
    ...(parsed.paging.pageSize === parsed.components.length ? await reposAtSonarServer(parsed.paging.pageIndex + 1)(sonarServer) : [])
  ];
};

export default (config: Config) => {
  const withDiskCache = usingDiskCache(config);

  const sonarRepos = withDiskCache(
    ['sonar'],
    () => Promise.all(config.sonar.map(reposAtSonarServer())).then(list => list.flat())
  );

  return async (project: string) => async (repoName: string): Promise<Measure[] | undefined> => {
    const currentSonarRepo = getCurrentRepo(repoName)(await sonarRepos);
    if (!currentSonarRepo) return undefined;

    const codeQuality = await withDiskCache(
      ['sonar', project, repoName],
      async () => {
        const response = await fetch(`${currentSonarRepo.url}/api/measures/component?${qs.stringify({
          component: currentSonarRepo.key,
          metricKeys: requiredMetrics.join(',')
        })}`);

        return (await response.json()).component as CodeQuality;
      }
    );

    return codeQuality.measures;
  };
};
