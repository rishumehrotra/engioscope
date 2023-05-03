import qs from 'qs';
import { map, prop } from 'rambda';
import { byDate, desc } from 'sort-lib';
import fetch from './fetch-with-extras.js';
import { requiredMetrics } from '../stats-aggregators/code-quality.js';
import fetchWithDiskCache from './fetch-with-disk-cache.js';
import createPaginatedGetter from './create-paginated-getter.js';
import type { Measure, SonarQualityGate } from '../types-sonar.js';
import type { SonarConfig } from '../parse-config.js';
// import { pastDate } from '../../utils.js';
import { getConfig } from '../../config.js';
import type { SonarConnection } from '../../models/mongoose-models/ConnectionModel.js';
import type { SonarProject } from '../../models/mongoose-models/sonar-models.js';
import { pastDate } from '../../utils.js';
import createChunkedPaginatedGetter from './create-chunked-paginated-getter.js';

type SonarSearchResponse = {
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  components: {
    organization?: string;
    id: string;
    key: string;
    name: string;
    qualifier: string;
    visibility: string;
    lastAnalysisDate?: Date;
  }[];
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
    qsParams: pageIndex => ({
      qualifiers: 'TRK', // Search projects only
      ps: '500',
      p: (pageIndex + 1).toString(),
    }),
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

export const lastAnalysisDateForProject =
  (sonarServer: SonarConnection) => (sonarProject: SonarProject) => {
    const { usingDiskCache } = fetchWithDiskCache(getConfig().cacheTimeMs);

    return usingDiskCache<{ component?: { analysisDate?: string } }>(
      ['sonar', 'analysis-date', sonarProject.key],
      () =>
        fetch(
          `${sonarServer.url}/api/components/show?${qs.stringify({
            component: sonarProject.key,
          })}`,
          {
            headers: {
              Authorization: `Basic ${Buffer.from(`${sonarServer.token}:`).toString(
                'base64'
              )}`,
            },
            verifySsl: sonarServer.verifySsl ?? true,
          }
        )
    ).then(res =>
      res.data.component?.analysisDate ? new Date(res.data.component.analysisDate) : null
    );
  };

export const getMeasures =
  (sonarServer: SonarConnection) => (sonarProject: Pick<SonarProject, 'key'>) => {
    const { usingDiskCache } = fetchWithDiskCache(getConfig().cacheTimeMs);

    return usingDiskCache<{ component?: { measures: Measure[] } }>(
      ['sonar', 'measures', sonarProject.key],
      () =>
        fetch(
          `${sonarServer.url}/api/measures/component?${qs.stringify({
            component: sonarProject.key,
            metricKeys: requiredMetrics.join(','),
          })}`,
          {
            headers: {
              Authorization: `Basic ${Buffer.from(`${sonarServer.token}:`).toString(
                'base64'
              )}`,
            },
            verifySsl: sonarServer.verifySsl ?? true,
          }
        )
    ).then(res => res.data.component?.measures || []);
  };

export const getQualityGate =
  (sonarServer: SonarConnection) => (sonarProject: SonarProject) => {
    const { usingDiskCache } = fetchWithDiskCache(getConfig().cacheTimeMs);

    return usingDiskCache<{
      qualityGate: { name: string; id: string; default: boolean };
    }>(['sonar', 'quality-gates', sonarProject.key], () =>
      fetch(
        `${sonarServer.url}/api/qualitygates/get_by_project?${qs.stringify({
          project: sonarProject.key,
        })}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${sonarServer.token}:`).toString(
              'base64'
            )}`,
          },
          verifySsl: sonarServer.verifySsl ?? true,
        }
      )
    )
      .then(res => res.data.qualityGate)
      .then(x => ({ ...x, id: String(x.id) }));
  };

export const getQualityGateHistoryAsChunks =
  (sonarServer: SonarConnection) =>
  (
    sonarProject: SonarProject,
    fetchFrom: Date | undefined,
    chunkHandler: (chunk: { value: SonarQualityGate; date: Date }[]) => Promise<void>
  ) => {
    const chunkedPaginatedGet = createChunkedPaginatedGetter(
      getConfig().cacheTimeMs,
      sonarServer.verifySsl ?? true
    );

    type SonarMeasureHistoryResponse<T extends string> = {
      paging: SonarPaging;
      measures: { metric: T; history: { date: Date; value: string }[] }[];
    };

    return chunkedPaginatedGet<SonarMeasureHistoryResponse<'alert_status'>>({
      url: `${sonarServer.url}/api/measures/search_history`,
      cacheFile: pageIndex => [
        'sonar',
        'alert-status-history',
        `${sonarServer.url.split('://')[1].replace(/\./g, '-')}`,
        `${sonarProject.key}-${pageIndex}`,
      ],
      headers: () => ({
        Authorization: `Basic ${Buffer.from(`${sonarServer.token}:`).toString('base64')}`,
      }),
      hasAnotherPage: previousResponse =>
        previousResponse.data.paging.total >
        previousResponse.data.paging.pageSize * previousResponse.data.paging.pageIndex,
      qsParams: pageIndex => ({
        ps: '500',
        p: (pageIndex + 1).toString(),
        component: sonarProject.key,
        metrics: 'alert_status',
        from: (fetchFrom || pastDate('365 days')).toISOString().split('T')[0],
      }),
      chunkHandler: chunk =>
        chunkHandler(
          chunk.data.measures
            .flatMap(m =>
              m.history.map(item => ({
                value: item.value as SonarQualityGate,
                date: new Date(item.date),
              }))
            )
            .flat()
        ),
    });
  };

export const getOneOlderQualityGateHistoryEntry =
  (sonarServer: SonarConnection) => async (sonarProject: SonarProject) => {
    const { lastAnalysisDate, key } = sonarProject;
    if (!lastAnalysisDate) return;

    const toDate = lastAnalysisDate.toISOString().split('T')[0];

    const temp = new Date(lastAnalysisDate);
    temp.setDate(temp.getDate() - 1);
    const fromDate = temp.toISOString().split('T')[0];

    const { usingDiskCache } = fetchWithDiskCache(getConfig().cacheTimeMs);

    type SonarMeasureHistoryResponse<T extends string> = {
      paging: SonarPaging;
      measures: { metric: T; history: { date: Date; value: string }[] }[];
    };

    return usingDiskCache<SonarMeasureHistoryResponse<'alert_status'>>(
      ['sonar', 'quality-gates-older', key],
      () => {
        return fetch(
          `${sonarServer.url}/api/measures/search_history?${qs.stringify({
            component: key,
            metrics: 'alert_status',
            from: fromDate,
            to: toDate,
          })}`,
          {
            headers: {
              Authorization: `Basic ${Buffer.from(`${sonarServer.token}:`).toString(
                'base64'
              )}`,
            },
            verifySsl: sonarServer.verifySsl ?? true,
          }
        );
      }
    ).then(result => {
      return result.data.measures
        .flatMap(m =>
          m.history.map(item => ({
            value: item.value as SonarQualityGate,
            date: new Date(item.date),
          }))
        )
        .flat()
        .sort(desc(byDate(prop('date'))))[0];
    });
  };
