// import qs from 'qs';
import { map } from 'rambda';
// import fetch from './fetch-with-extras.js';
// import { requiredMetrics } from '../stats-aggregators/code-quality.js';
// import fetchWithDiskCache from './fetch-with-disk-cache.js';
import createPaginatedGetter from './create-paginated-getter.js';
// import type { Measure, SonarQualityGate } from '../types-sonar.js';
import type { SonarConfig } from '../parse-config.js';
// import { pastDate } from '../../utils.js';
import { getConfig } from '../../config.js';

export type SonarProject = {
  organization?: string;
  id: string;
  key: string;
  name: string;
  qualifier: string;
  visibility: string;
  lastAnalysisDate?: Date;
};

type SonarPaging = {
  pageIndex: number;
  pageSize: number;
  total: number;
};

// type MeasureDefinition = {
//   id: string;
//   key: string;
//   type:
//     | 'INT'
//     | 'FLOAT'
//     | 'PERCENT'
//     | 'BOOL'
//     | 'STRING'
//     | 'MILLISEC'
//     | 'DATA'
//     | 'LEVEL'
//     | 'DISTRIB'
//     | 'RATING'
//     | 'WORK_DUR';
//   name: string;
//   description: string;
//   domain?:
//     | 'Maintainability'
//     | 'Issues'
//     | 'Reliability'
//     | 'Management'
//     | 'Size'
//     | 'Complexity'
//     | 'Coverage'
//     | 'SCM'
//     | 'Duplications'
//     | 'Security'
//     | 'General'
//     | 'Documentation'
//     | 'Releasability';
//   direction: -1 | 0 | 1;
//   qualitative: boolean;
//   hidden: boolean;
//   custom: boolean;
// };

export const projectsAtSonarServer = (sonarServer: SonarConfig) => {
  const paginatedGet = createPaginatedGetter(
    getConfig().cacheTimeMs,
    sonarServer.verifySsl ?? true
  );
  type SonarSearchResponse = { paging: SonarPaging; components: SonarProject[] };

  return paginatedGet<SonarSearchResponse>({
    url: `${sonarServer.url}/api/projects/search`,
    cacheFile: pageIndex => [
      'sonar',
      'projects',
      `${sonarServer.url.split('://')[1].replace(/\./g, '-')}-${pageIndex}`,
    ],
    headers: () => ({
      Authorization: `Basic ${Buffer.from(`${sonarServer.token}:`).toString('base64')}`,
    }),
    hasAnotherPage: previousResponse =>
      previousResponse.data.paging.pageSize === previousResponse.data.components.length,
    qsParams: pageIndex => ({ ps: '500', p: (pageIndex + 1).toString() }),
  })
    .then(responses => responses.map(response => response.data.components))
    .then(projects => projects.flat())
    .then(
      map(p => ({
        ...p,
        lastAnalysisDate: p.lastAnalysisDate ? new Date(p.lastAnalysisDate) : undefined,
      }))
    );
};

// export const getMeasureDefinitions = ({ url, token, verifySsl }: SonarConfig) => {
//   const { usingDiskCache } = fetchWithDiskCache(getConfig().cacheTimeMs);

//   return usingDiskCache<{ metrics: MeasureDefinition[] }>(
//     ['sonar', 'measures-definitions', url.split('://')[1].replace(/\./g, '-')],
//     () =>
//       fetch(`${url}/api/metrics/search?ps=200`, {
//         headers: {
//           Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}`,
//         },
//         verifySsl: verifySsl ?? true,
//       })
//   ).then(res => res.data.metrics);
// };

// export const getMeasures = (sonarProject: SonarProject) => {
//   const { usingDiskCache } = fetchWithDiskCache(getConfig().cacheTimeMs);

//   return usingDiskCache<{ component?: { measures: Measure[] } }>(
//     ['sonar', 'measures', sonarProject.key],
//     () =>
//       fetch(
//         `${sonarProject.url}/api/measures/component?${qs.stringify({
//           component: sonarProject.key,
//           metricKeys: requiredMetrics.join(','),
//         })}`,
//         {
//           headers: {
//             Authorization: `Basic ${Buffer.from(`${sonarProject.token}:`).toString(
//               'base64'
//             )}`,
//           },
//           verifySsl: sonarProject.verifySsl ?? true,
//         }
//       )
//   ).then(res => ({
//     name: sonarProject.name,
//     url: `${sonarProject.url}/dashboard?id=${sonarProject.key}`,
//     measures: res.data.component?.measures || [],
//     lastAnalysisDate: sonarProject.lastAnalysisDate
//       ? new Date(sonarProject.lastAnalysisDate)
//       : null,
//   }));
// };

// export const getQualityGateName = (sonarProject: SonarProject) => {
//   const { usingDiskCache } = fetchWithDiskCache(getConfig().cacheTimeMs);

//   return usingDiskCache<{ qualityGate: { name: string } }>(
//     ['sonar', 'quality-gates', sonarProject.key],
//     () =>
//       fetch(
//         `${sonarProject.url}/api/qualitygates/get_by_project?${qs.stringify({
//           project: sonarProject.key,
//         })}`,
//         {
//           headers: {
//             Authorization: `Basic ${Buffer.from(`${sonarProject.token}:`).toString(
//               'base64'
//             )}`,
//           },
//           verifySsl: sonarProject.verifySsl ?? true,
//         }
//       )
//   ).then(res => res.data.qualityGate.name);
// };

// export const getQualityGateHistory = (sonarProject: SonarProject) => {
//   const paginatedGet = createPaginatedGetter(
//     getConfig().cacheTimeMs,
//     sonarProject.verifySsl ?? true
//   );

//   type SonarMeasureHistoryResponse<T extends string> = {
//     paging: SonarPaging;
//     measures: { metric: T; history: { date: Date; value: string }[] }[];
//   };

//   return paginatedGet<SonarMeasureHistoryResponse<'alert_status'>>({
//     url: `${sonarProject.url}/api/measures/search_history`,
//     cacheFile: pageIndex => [
//       'sonar',
//       'alert-status-history',
//       `${sonarProject.url.split('://')[1].replace(/\./g, '-')}`,
//       `${sonarProject.key}-${pageIndex}`,
//     ],
//     headers: () => ({
//       Authorization: `Basic ${Buffer.from(`${sonarProject.token}:`).toString('base64')}`,
//     }),
//     hasAnotherPage: previousResponse =>
//       previousResponse.data.paging.total >
//       previousResponse.data.paging.pageSize * previousResponse.data.paging.pageIndex,
//     qsParams: pageIndex => ({
//       ps: '500',
//       p: (pageIndex + 1).toString(),
//       component: sonarProject.key,
//       metrics: 'alert_status',
//       from: pastDate('182 days').toISOString().split('T')[0],
//     }),
//   })
//     .then(responses =>
//       responses.map(response => response.data.measures.flatMap(m => m.history))
//     )
//     .then(history => history.flat())
//     .then(history =>
//       history.map(item => ({
//         value: item.value as SonarQualityGate,
//         date: new Date(item.date),
//       }))
//     );
// };
