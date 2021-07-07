import fetch from 'node-fetch';
import qs from 'qs';
import { CodeQuality, Config, Measure } from './types';
import { requiredMetrics } from './analyse-repos/aggregate-code-quality';
import usingDiskCache from './using-disk-cache';

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

const reposAtSonarServer = async (sonarServer: Config['sonar'][number]) => {
  const { url, token } = sonarServer;
  const sonarProjectsResponse = await fetch(`${url}/api/projects/search`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${token}`
    }
  });
  console.log('Sonar Repos');
  const parsed = await sonarProjectsResponse.json();
  console.log(parsed);
  return parsed.components.map((component: any) => ({ ...component, url })) as SonarRepo[];
};

export default (config: Config) => {
  const withDiskCache = usingDiskCache(config);

  const sonarRepos = withDiskCache(
    ['sonar'],
    () => Promise.all(config.sonar.map(reposAtSonarServer)).then(list => list.flat())
  );

  return async (project: string) => async (repoName: string): Promise<Measure[] | undefined> => {
    const currentSonarRepo = (await sonarRepos).find(({ name }) => name === repoName);
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
