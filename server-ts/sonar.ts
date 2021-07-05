import fetch from 'node-fetch';
import qs from 'qs';
import config, { Config } from './config';
import { CodeQuality, Measure } from './types';
import { requiredMetrics } from './analyse-repos/aggregate-code-quality';
import withDiskCache from './with-disk-cache';

export type SonarRepo = {
  organization: string,
  id: string,
  key: string,
  name: string,
  qualifier: string,
  visibility: string,
  lastAnalysisDate: string
};

export default async (project: string) => {
  const projectConfig = config.sonar[project as keyof Config['sonar']];

  if (!projectConfig) return async () => undefined;

  const sonarRepos = await withDiskCache(
    ['sonar', project],
    async () => {
      const sonarProjectsResponse = await fetch(`${projectConfig.url}/api/projects/search`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${projectConfig.token}`
        }
      });
      return (await sonarProjectsResponse.json()).components as SonarRepo[];
    }
  );

  return async (repoName: string): Promise<Measure[] | undefined> => {
    const currentSonarRepo = sonarRepos.find(({ name }) => name === repoName);
    if (!currentSonarRepo) return undefined;

    const codeQuality = await withDiskCache(
      ['sonar', project, repoName],
      async () => {
        const response = await fetch(`${projectConfig.url}/api/measures/component?${qs.stringify({
          component: currentSonarRepo.key,
          metricKeys: requiredMetrics.join(',')
        })}`);

        return (await response.json()).component as CodeQuality;
      }
    );

    return codeQuality.measures;
  };
};
