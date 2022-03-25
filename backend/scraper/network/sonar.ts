import qs from 'qs';
import fetch from './fetch-with-timeout';
import { requiredMetrics } from '../stats-aggregators/code-quality';
import fetchWithDiskCache from './fetch-with-disk-cache';
import createPaginatedGetter from './create-paginated-getter';
import type { Measure, SonarAnalysisByRepo, SonarQualityGate } from '../types-sonar';
import type { ParsedConfig, SonarConfig } from '../parse-config';
import { pastDate, unique } from '../../utils';
import parseBuildReports from '../parse-build-reports';

export type SonarProject = {
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

// #region Network calls
type SonarPaging = {
  pageIndex: number;
  pageSize: number;
  total: number;
};

const projectsAtSonarServer = (config: ParsedConfig) => (sonarServer: SonarConfig) => {
  const paginatedGet = createPaginatedGetter(config.cacheTimeMs);
  type SonarSearchResponse = { paging: SonarPaging; components: SonarProject[] };

  return (
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
      .then(projects => projects.flat())
  );
};

const getMeasures = (config: ParsedConfig) => (sonarProject: SonarProject) => {
  const { usingDiskCache } = fetchWithDiskCache(config.cacheTimeMs);

  return usingDiskCache<{ component?: { measures: Measure[] } }>(
    ['sonar', 'measures', sonarProject.key],
    () => fetch(`${sonarProject.url}/api/measures/component?${qs.stringify({
      component: sonarProject.key,
      metricKeys: requiredMetrics.join(',')
    })}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${sonarProject.token}:`).toString('base64')}`
      }
    })
  ).then(res => ({
    name: sonarProject.name,
    url: `${sonarProject.url}/dashboard?id=${sonarProject.name}`,
    measures: res.data.component?.measures || [],
    lastAnalysisDate: sonarProject.lastAnalysisDate
  }));
};

const getQualityGateName = (config: ParsedConfig) => (sonarProject: SonarProject) => {
  const { usingDiskCache } = fetchWithDiskCache(config.cacheTimeMs);

  return usingDiskCache<{ qualityGate: { name: string } }>(
    ['sonar', 'quality-gates', sonarProject.key],
    () => fetch(`${sonarProject.url}/api/qualitygates/get_by_project?${qs.stringify({
      project: sonarProject.key
    })}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${sonarProject.token}:`).toString('base64')}`
      }
    })
  ).then(res => res.data.qualityGate.name);
};

const getQualityGateHistory = (config: ParsedConfig) => (sonarProject: SonarProject) => {
  const paginatedGet = createPaginatedGetter(config.cacheTimeMs);

  type SonarMeasureHistoryResponse<T extends string> = {
    paging: SonarPaging;
    measures: { metric: T; history: { date: Date; value: string }[] }[];
  };

  return (
    paginatedGet<SonarMeasureHistoryResponse<'alert_status'>>({
      url: `${sonarProject.url}/api/measures/search_history`,
      cacheFile: pageIndex => [
        'sonar', 'alert-status-history', `${sonarProject.url.split('://')[1].replace(/\./g, '-')}`, `${sonarProject.key}-${pageIndex}`
      ],
      headers: () => ({ Authorization: `Basic ${Buffer.from(`${sonarProject.token}:`).toString('base64')}` }),
      hasAnotherPage: previousResponse => (
        previousResponse.data.paging.total > (previousResponse.data.paging.pageSize * previousResponse.data.paging.pageIndex)
      ),
      qsParams: pageIndex => ({
        ps: '500',
        p: (pageIndex + 1).toString(),
        component: sonarProject.key,
        metrics: 'alert_status',
        from: pastDate('6 months').toISOString()
      })
    })
      .then(responses => responses.map(response => response.data.measures.map(m => m.history).flat()))
      .then(history => history.flat())
      .then(history => history.map(item => ({ ...item, date: new Date(item.date) })))
  );
};

// #endregion

const sortByLastAnalysedDate = (a: SonarProject, b: SonarProject) => (
  new Date(b.lastAnalysisDate).getTime() - new Date(a.lastAnalysisDate).getTime()
);

const normliseNameForMatching = (name: string) => (
  name.replace(/-/g, '_').toLowerCase()
);

// #region Attempt to find a sonar project
const attemptExactMatchFind = (repoName: string, sonarProjects: SonarProject[]) => {
  const matchingProjects = sonarProjects
    .filter(project => (
      normliseNameForMatching(project.name) === normliseNameForMatching(repoName)
      && Boolean(project.lastAnalysisDate)
    ))
    .sort(sortByLastAnalysedDate);

  return matchingProjects.length > 0 ? [matchingProjects[0]] : null;
};

const attemptStartsWithFind = (repoName: string, sonarProjects: SonarProject[]) => {
  const matchingProjects = sonarProjects
    .filter(project => (
      normliseNameForMatching(project.name).startsWith(normliseNameForMatching(repoName))
      && Boolean(project.lastAnalysisDate)
    ))
    .sort(sortByLastAnalysedDate);

  return matchingProjects.length > 0 ? matchingProjects : null;
};

const attemptMatchFromBuildReports = async (
  repoName: string,
  defaultBranch: string | undefined,
  sonarProjects: SonarProject[],
  parseReports: ReturnType<typeof parseBuildReports>
) => {
  if (!defaultBranch) return null;

  const sonarConfigs = await parseReports(repoName, defaultBranch);

  const projectKeys = unique(sonarConfigs.map(({ sonarProjectKey }) => sonarProjectKey));
  const matchingSonarProjects = sonarProjects.filter(({ key }) => projectKeys.includes(key));

  return matchingSonarProjects.length ? matchingSonarProjects : null;
};

const attemptMatchByRepoName = (repoName: string, sonarProjects: SonarProject[]) => (
  attemptExactMatchFind(repoName, sonarProjects)
  || attemptStartsWithFind(repoName, sonarProjects)
);

const getMatchingSonarProjects = async (
  repoName: string,
  defaultBranch: string | undefined,
  sonarProjects: SonarProject[],
  parseReports: ReturnType<typeof parseBuildReports>
) => {
  const sonarProjectsFromBuildReports = await attemptMatchFromBuildReports(
    repoName, defaultBranch, sonarProjects, parseReports
  );
  return sonarProjectsFromBuildReports || attemptMatchByRepoName(repoName, sonarProjects);
};

// #endregion

export default (config: ParsedConfig) => {
  const sonarProjects = Promise.all((config.sonar || []).map(projectsAtSonarServer(config)))
    .then(list => list.flat());

  return (
    collectionName: string, projectName: string
  ) => async (repoName: string, defaultBranch?: string): Promise<SonarAnalysisByRepo> => {
    const matchingSonarProjects = await getMatchingSonarProjects(
      repoName, defaultBranch, await sonarProjects,
      parseBuildReports(collectionName, projectName)
    );

    if (!matchingSonarProjects) return null;

    return Promise.all(matchingSonarProjects.map(sonarProject => (
      Promise.all([
        getMeasures(config)(sonarProject),
        getQualityGateName(config)(sonarProject),
        getQualityGateHistory(config)(sonarProject)
      ]).then(([measures, qualityGateName, history]) => ({
        ...measures,
        qualityGateName,
        qualityGateHistory: history as { date: Date; value: SonarQualityGate }[]
      }))
    )));
  };
};
