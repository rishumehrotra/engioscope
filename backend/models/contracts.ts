import { asc, byNum, byString } from 'sort-lib';
import { intersection, propEq, range } from 'rambda';
import type { FilterQuery, PipelineStage } from 'mongoose';
import path from 'node:path';
import md5 from 'md5';
import { inDateRange } from './helpers.js';
import type { QueryContext } from './utils.js';
import { fromContext, weekIndexValue } from './utils.js';
import { createIntervals } from '../utils.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import { AzureBuildReportModel } from './build-reports.js';

const getBuildDefIds = (collectionName: string, project: string) =>
  BuildDefinitionModel.find({ collectionName, project }, { id: 1, _id: 0 }) as Promise<
    { id: string }[]
  >;

const buildReportsWithSpecmatic = (
  queryContext: QueryContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalClauses: FilterQuery<any> = {}
): PipelineStage => {
  const { collectionName, project } = fromContext(queryContext);

  return {
    $match: {
      collectionName,
      project,
      specmaticConfigPath: { $exists: true },
      ...additionalClauses,
    },
  };
};

const addTotalAndCoveredOperationsFields = {
  $addFields: {
    totalOperations: { $size: '$specmaticCoverage.operations' },
    coveredOperations: {
      $size: {
        $filter: {
          input: '$specmaticCoverage.operations',
          as: 'operation',
          cond: { $eq: ['$$operation.coverageStatus', 'covered'] },
        },
      },
    },
  },
};

const groupByBuildId = {
  $group: {
    _id: '$buildId',
    buildDefinitionId: { $first: '$buildDefinitionId' },
    totalOperations: { $sum: '$totalOperations' },
    coveredOperations: { $sum: '$coveredOperations' },
    createdAt: { $first: '$createdAt' },
  },
};

type ApiCoverage = {
  weekIndex: number;
  buildDefinitionId: string;
  totalOperations: number;
  coveredOperations: number;
};

export const getWeeklyApiCoveragePercentage = async (queryContext: QueryContext) => {
  const { startDate, endDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<ApiCoverage>([
    buildReportsWithSpecmatic(queryContext, {
      createdAt: inDateRange(startDate, endDate),
      specmaticCoverage: { $exists: true },
    }),
    { $unwind: '$specmaticCoverage' },
    { $match: { 'specmaticCoverage.serviceType': 'HTTP' } },
    addTotalAndCoveredOperationsFields,
    groupByBuildId,
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: {
          weekIndex: weekIndexValue(startDate, '$createdAt'),
          buildDefinitionId: '$buildDefinitionId',
        },
        totalOperations: { $last: '$totalOperations' },
        coveredOperations: { $last: '$coveredOperations' },
        // for debugging
        latestBuildId: { $last: '$_id' },
      },
    },
    {
      $project: {
        _id: 0,
        weekIndex: '$_id.weekIndex',
        buildDefinitionId: '$_id.buildDefinitionId',
        totalOperations: 1,
        coveredOperations: 1,
        // for debugging
        latestBuildId: 1,
      },
    },
  ]);
};

export const getOneOlderApiCoverageForBuildDefinition = async (
  queryContext: QueryContext,
  buildDefinitionId: string
) => {
  const { startDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    // buildId: string;
    buildDefinitionId: string;
    totalOperations: number;
    coveredOperations: number;
    // createdAt: Date;
  }>([
    buildReportsWithSpecmatic(queryContext, {
      buildDefinitionId,
      createdAt: { $lt: startDate },
      specmaticCoverage: { $exists: true },
    }),
    { $sort: { createdAt: -1 } },
    { $limit: 1 },
    { $unwind: '$specmaticCoverage' },
    { $match: { 'specmaticCoverage.serviceType': 'HTTP' } },
    addTotalAndCoveredOperationsFields,
    groupByBuildId,
    { $addFields: { buildId: '$_id' } },
    { $project: { _id: 0 } },
  ]).then(results => (results.length ? results[0] : null));
};

const makeContinuous = async <T>(
  queryContext: QueryContext,
  weeklyData: ({ weekIndex: number } & T)[],
  getOneOlderItem: () => Promise<T | null>,
  makeNonNull: (item: T | null | undefined) => T
) => {
  const { startDate, endDate } = fromContext(queryContext);
  const { numberOfIntervals } = createIntervals(startDate, endDate);
  const hasDataForTheFirstWeek = weeklyData.some(propEq('weekIndex', 0));

  const dataByWeek = hasDataForTheFirstWeek
    ? weeklyData
    : [{ weekIndex: 0, ...makeNonNull(await getOneOlderItem()) }, ...weeklyData];

  return range(0, numberOfIntervals).reduce<({ weekIndex: number } & T)[]>(
    (acc, weekIndex) => {
      const matchingItem = dataByWeek.find(propEq('weekIndex', weekIndex));

      // if (matchingItem) {
      //   console.log(`matchingItem at ${weekIndex}`, matchingItem);
      // }

      if (matchingItem) {
        acc.push(matchingItem);
        return acc;
      }

      const lastItem = acc.at(-1);
      acc.push({ weekIndex, ...makeNonNull(lastItem) });
      return acc;
    },
    []
  );
};

export const getWeeklyApiCoverageSummary = async (queryContext: QueryContext) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const { numberOfIntervals } = createIntervals(startDate, endDate);

  const [apiCoveragesForDefs, buildDefs] = await Promise.all([
    getWeeklyApiCoveragePercentage(queryContext),
    getBuildDefIds(collectionName, project),
  ]);

  const buildDefsWithCoverage = buildDefs.map(buildDef => {
    const matchingCoverages = apiCoveragesForDefs.filter(
      coverage => coverage.buildDefinitionId === buildDef.id.toString()
    );
    return {
      buildDefId: buildDef.id.toString(),
      coverageByWeek: matchingCoverages.sort(asc(byNum(w => w.weekIndex))),
    };
  });

  const continuousCoverage = await Promise.all(
    buildDefsWithCoverage.map(async ({ buildDefId, coverageByWeek }) => {
      return {
        buildDefId,
        coverageByWeek: await makeContinuous(
          queryContext,
          coverageByWeek,
          () => getOneOlderApiCoverageForBuildDefinition(queryContext, buildDefId),
          item => ({
            buildDefinitionId: buildDefId,
            totalOperations: item?.totalOperations || 0,
            coveredOperations: item?.coveredOperations || 0,
          })
        ),
      };
    })
  );

  return range(0, numberOfIntervals).map(weekIndex => {
    const weekCoverage = continuousCoverage.reduce<{
      totalOperations: number;
      coveredOperations: number;
    }>(
      (acc, { coverageByWeek }) => {
        const matchingCoverage = coverageByWeek.find(
          coverage => coverage.weekIndex === weekIndex
        );
        if (matchingCoverage) {
          acc.totalOperations += matchingCoverage.totalOperations;
          acc.coveredOperations += matchingCoverage.coveredOperations;
        }
        return acc;
      },
      { totalOperations: 0, coveredOperations: 0 }
    );

    return {
      weekIndex,
      totalOperations: weekCoverage.totalOperations,
      coveredOperations: weekCoverage.coveredOperations,
    };
  });
};

const addFieldsStubUsage: PipelineStage[] = [
  { $unwind: '$specmaticStubUsage' },
  { $match: { 'specmaticStubUsage.serviceType': 'HTTP' } },
  {
    $addFields: {
      totalOperations: { $size: '$specmaticStubUsage.operations' },
      zeroCountOperations: {
        $size: {
          $filter: {
            input: '$specmaticStubUsage.operations',
            as: 'operation',
            cond: { $eq: ['$$operation.count', 0] },
          },
        },
      },
    },
  },
];

const getStubUsage = async (queryContext: QueryContext) => {
  const { startDate, endDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    weekIndex: number;
    buildDefinitionId: string;
    totalOperations: number;
    zeroCountOperations: number;
  }>([
    buildReportsWithSpecmatic(queryContext, {
      createdAt: inDateRange(startDate, endDate),
      specmaticStubUsage: { $exists: true },
    }),
    ...addFieldsStubUsage,
    {
      $group: {
        _id: '$buildId',
        buildDefinitionId: { $first: '$buildDefinitionId' },
        totalOperations: { $sum: '$totalOperations' },
        zeroCountOperations: { $sum: '$zeroCountOperations' },
        createdAt: { $first: '$createdAt' },
      },
    },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: {
          weekIndex: weekIndexValue(startDate, '$createdAt'),
          buildDefinitionId: '$buildDefinitionId',
        },
        totalOperations: { $last: '$totalOperations' },
        zeroCountOperations: { $last: '$zeroCountOperations' },
        latestBuildId: { $last: '$_id' },
      },
    },
    {
      $addFields: {
        weekIndex: '$_id.weekIndex',
        buildDefinitionId: '$_id.buildDefinitionId',
      },
    },
    { $project: { _id: 0 } },
  ]);
};

const getOneOlderStubUsageForBuildDefinition = async (
  queryContext: QueryContext,
  buildDefinitionId: string
) => {
  const { startDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    // buildId: string;
    buildDefinitionId: string;
    totalOperations: number;
    zeroCountOperations: number;
    // createdAt: Date;
  }>([
    buildReportsWithSpecmatic(queryContext, {
      buildDefinitionId,
      createdAt: { $lt: startDate },
      specmaticStubUsage: { $exists: true },
    }),
    { $sort: { createdAt: -1 } },
    { $limit: 1 },
    ...addFieldsStubUsage,
    {
      $group: {
        _id: '$buildId',
        buildDefinitionId: { $first: '$buildDefinitionId' },
        totalOperations: { $sum: '$totalOperations' },
        zeroCountOperations: { $sum: '$zeroCountOperations' },
        createdAt: { $first: '$createdAt' },
      },
    },
    { $addFields: { buildId: '$_id' } },
    { $project: { _id: 0 } },
  ]).then(results => (results.length ? results[0] : null));
};

export const getWeeklyStubUsageSummary = async (queryContext: QueryContext) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const { numberOfIntervals } = createIntervals(startDate, endDate);

  const [stubUsageForDefs, buildDefs] = await Promise.all([
    getStubUsage(queryContext),
    getBuildDefIds(collectionName, project),
  ]);

  const buildDefsWithStubUsage = buildDefs.map(buildDef => {
    const matchingStubUsage = stubUsageForDefs.filter(
      coverage => coverage.buildDefinitionId === buildDef.id.toString()
    );
    return {
      buildDefId: buildDef.id.toString(),
      stubUsageByWeek: matchingStubUsage.sort(asc(byNum(w => w.weekIndex))),
    };
  });

  const continuousStubUsage = await Promise.all(
    buildDefsWithStubUsage.map(async ({ buildDefId, stubUsageByWeek }) => {
      return {
        buildDefId,
        stubUsageByWeek: await makeContinuous(
          queryContext,
          stubUsageByWeek,
          () => getOneOlderStubUsageForBuildDefinition(queryContext, buildDefId),
          item => ({
            buildDefinitionId: buildDefId,
            totalOperations: item?.totalOperations || 0,
            zeroCountOperations: item?.zeroCountOperations || 0,
          })
        ),
      };
    })
  );

  return range(0, numberOfIntervals).map(weekIndex => {
    const weekStubUsage = continuousStubUsage.reduce<{
      totalOperations: number;
      zeroCountOperations: number;
    }>(
      (acc, { stubUsageByWeek }) => {
        const matchingStubUsage = stubUsageByWeek.find(
          coverage => coverage.weekIndex === weekIndex
        );
        if (matchingStubUsage) {
          acc.totalOperations += matchingStubUsage.totalOperations;
          acc.zeroCountOperations += matchingStubUsage.zeroCountOperations;
        }
        return acc;
      },
      {
        totalOperations: 0,
        zeroCountOperations: 0,
      }
    );

    return {
      weekIndex,
      totalOperations: weekStubUsage.totalOperations,
      zeroCountOperations: weekStubUsage.zeroCountOperations,
    };
  });
};

const filterCoverageAndStubs: PipelineStage[] = [
  {
    $addFields: {
      specmaticCoverage: {
        $filter: {
          input: '$specmaticCoverage',
          as: 'coverage',
          cond: { $eq: ['$$coverage.serviceType', 'HTTP'] },
        },
      },
      specmaticStubUsage: {
        $filter: {
          input: '$specmaticStubUsage',
          as: 'stub',
          cond: { $eq: ['$$stub.serviceType', 'HTTP'] },
        },
      },
    },
  },
];

const unwindCoverageAndStubOperations: PipelineStage[] = [
  {
    $unwind: {
      path: '$specmaticCoverage',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $unwind: {
      path: '$specmaticCoverage.operations',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $unwind: {
      path: '$specmaticStubUsage',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $unwind: {
      path: '$specmaticStubUsage.operations',
      preserveNullAndEmptyArrays: true,
    },
  },
];

type Service = {
  repoId: string;
  repoName: string;
  leafDirectory: string; // This is the leaf directory of the specmaticConfigPath
  serviceId: string; // Can be skipped, not needed on the UI
  endpoints: {
    specId: string;
    path: string;
    method: string;
  }[];
  dependsOn: {
    specId: string;
    path: string;
    method: string;
  }[];
};

const serviceServesEndpoint =
  (dependency: Service['dependsOn'][number]) =>
  (service: Service): boolean =>
    service.endpoints.some(
      endpoint =>
        endpoint.path === dependency.path &&
        endpoint.method === dependency.method &&
        endpoint.specId === dependency.specId
    );

export const getServiceGraph = async (queryContext: QueryContext) => {
  const { endDate } = fromContext(queryContext);

  const services = await AzureBuildReportModel.aggregate<Service>([
    buildReportsWithSpecmatic(queryContext, {
      createdAt: { $lt: endDate },
      $or: [
        { specmaticCoverage: { $exists: true } },
        { specmaticStubUsage: { $exists: true } },
      ],
    }),
    ...filterCoverageAndStubs,
    { $sort: { createdAt: 1 } },
    { $group: { _id: '$buildDefinitionId', build: { $last: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$build' } },
    { $addFields: { serviceId: { $concat: ['$repoId', '$specmaticConfigPath'] } } },
    ...unwindCoverageAndStubOperations,
    {
      $group: {
        _id: '$buildId',
        repoId: { $first: '$repoId' },
        repoName: { $first: '$repo' },
        serviceId: { $first: '$serviceId' },
        leafDirectory: { $first: '$specmaticConfigPath' },
        endpoints: {
          $addToSet: {
            specId: '$specmaticCoverage.specId',
            path: '$specmaticCoverage.operations.path',
            method: '$specmaticCoverage.operations.method',
          },
        },
        dependsOn: {
          $addToSet: {
            specId: '$specmaticStubUsage.specId',
            path: '$specmaticStubUsage.operations.path',
            method: '$specmaticStubUsage.operations.method',
          },
        },
      },
    },
    {
      $addFields: {
        buildDefinitionId: '$_id',
        endpoints: {
          $filter: {
            input: '$endpoints',
            as: 'endpoint',
            cond: { $ne: ['$$endpoint', {}] },
          },
        },
        dependsOn: {
          $filter: {
            input: '$dependsOn',
            as: 'dependency',
            cond: { $ne: ['$$dependency', {}] },
          },
        },
      },
    },
    { $project: { _id: 0 } },
  ]);

  const isMonorepo = (() => {
    const hasRepoBeenSeenTwice = new Map<string, boolean>();
    services.forEach(service => {
      if (hasRepoBeenSeenTwice.has(service.repoId)) {
        hasRepoBeenSeenTwice.set(service.repoId, true);
      } else hasRepoBeenSeenTwice.set(service.repoId, false);
    });

    return (repoId: string) => hasRepoBeenSeenTwice.get(repoId) || false;
  })();

  return services
    .map(s => {
      const leafDirectory = path.dirname(s.leafDirectory).split(path.sep).at(-1);

      return {
        name: isMonorepo(s.repoId) ? leafDirectory : s.repoName,
        serviceId: md5(s.serviceId),
        endpoints: s.endpoints.map(endpoint => ({
          ...endpoint,
          serviceId: md5(s.serviceId),
        })),
        dependsOn: s.dependsOn.map(dependency => ({
          ...dependency,
          serviceId: md5(
            services.find(serviceServesEndpoint(dependency))?.serviceId || ''
          ),
        })),
      };
    })
    .sort(byString(x => x.serviceId));
};

const groupUniqueCoverageAndStubOperations: PipelineStage[] = [
  {
    $group: {
      _id: '$buildId',
      buildId: { $first: '$buildId' },
      buildDefinitionId: { $first: '$buildDefinitionId' },
      createdAt: { $first: '$createdAt' },
      coverageOps: {
        $addToSet: {
          specId: '$specmaticCoverage.specId',
          path: '$specmaticCoverage.operations.path',
          method: '$specmaticCoverage.operations.method',
          responseCode: '$specmaticCoverage.operations.responseCode',
        },
      },
      stubOps: {
        $addToSet: {
          specId: '$specmaticStubUsage.specId',
          path: '$specmaticStubUsage.operations.path',
          method: '$specmaticStubUsage.operations.method',
          responseCode: '$specmaticStubUsage.operations.responseCode',
        },
      },
    },
  },
  {
    $addFields: {
      coverageOps: {
        $filter: {
          input: '$coverageOps',
          as: 'coverageOp',
          cond: { $ne: ['$$coverageOp', {}] },
        },
      },
      stubOps: {
        $filter: {
          input: '$stubOps',
          as: 'stubOp',
          cond: { $ne: ['$$stubOp', {}] },
        },
      },
    },
  },
];

const getConsumerProducerSpecAndOperationsCount = async (queryContext: QueryContext) => {
  const { startDate, endDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    weekIndex: number;
    buildDefinitionId: string;
    coverageOps: {
      specId: string;
      path: string;
      method: string;
      responseCode: string;
    }[];
    stubOps: {
      specId: string;
      path: string;
      method: string;
      responseCode: string;
    }[];
  }>([
    buildReportsWithSpecmatic(queryContext, {
      createdAt: inDateRange(startDate, endDate),
      $or: [
        { specmaticCoverage: { $exists: true } },
        { specmaticStubUsage: { $exists: true } },
      ],
    }),
    ...filterCoverageAndStubs,
    ...unwindCoverageAndStubOperations,
    ...groupUniqueCoverageAndStubOperations,
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: {
          weekIndex: weekIndexValue(startDate, '$createdAt'),
          buildDefinitionId: '$buildDefinitionId',
        },
        coverageOps: { $last: '$coverageOps' },
        stubOps: { $last: '$stubOps' },
        latestBuildId: { $last: '$_id' },
      },
    },
    {
      $addFields: {
        weekIndex: '$_id.weekIndex',
        buildDefinitionId: '$_id.buildDefinitionId',
      },
    },
    { $project: { _id: 0 } },
  ]);
};

const getOlderConsumerProducerSpecAndOpsForBuildDef = async (
  queryContext: QueryContext,
  buildDefinitionId: string
) => {
  const { startDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    // buildId: string;
    buildDefinitionId: string;
    coverageOps: {
      specId: string;
      path: string;
      method: string;
      responseCode: string;
    }[];
    stubOps: {
      specId: string;
      path: string;
      method: string;
      responseCode: string;
    }[];
    // createdAt: Date;
  }>([
    buildReportsWithSpecmatic(queryContext, {
      buildDefinitionId,
      createdAt: { $lt: startDate },
      $or: [
        { specmaticCoverage: { $exists: true } },
        { specmaticStubUsage: { $exists: true } },
      ],
    }),
    { $sort: { createdAt: -1 } },
    { $limit: 1 },
    ...filterCoverageAndStubs,
    ...unwindCoverageAndStubOperations,
    ...groupUniqueCoverageAndStubOperations,
    { $project: { _id: 0 } },
  ]).then(results => (results.length ? results[0] : null));
};

export const getWeeklyConsumerProducerSpecAndOperationsCount = async (
  queryContext: QueryContext
) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const { numberOfIntervals } = createIntervals(startDate, endDate);
  const [consumerProducerSpecAndOpsCountForDefs, buildDefs] = await Promise.all([
    getConsumerProducerSpecAndOperationsCount(queryContext),
    getBuildDefIds(collectionName, project),
  ]);

  const buildDefsWithCount = buildDefs.map(buildDef => {
    const matchingDefsCount = consumerProducerSpecAndOpsCountForDefs.filter(
      coverage => coverage.buildDefinitionId === buildDef.id.toString()
    );
    return {
      buildDefId: buildDef.id.toString(),
      countByWeek: matchingDefsCount.sort(asc(byNum(w => w.weekIndex))),
    };
  });

  const continuousCount = await Promise.all(
    buildDefsWithCount.map(async ({ buildDefId, countByWeek }) => {
      return {
        buildDefId,
        countByWeek: await makeContinuous(
          queryContext,
          countByWeek,
          () => getOlderConsumerProducerSpecAndOpsForBuildDef(queryContext, buildDefId),
          item => ({
            buildDefinitionId: buildDefId,
            coverageOps: item?.coverageOps || [],
            stubOps: item?.stubOps || [],
          })
        ),
      };
    })
  );

  return range(0, numberOfIntervals).map(weekIndex => {
    const weeklyCount = continuousCount.reduce<{
      coverageOps: {
        specId: string;
        path: string;
        method: string;
        responseCode: string;
      }[];
      stubOps: {
        specId: string;
        path: string;
        method: string;
        responseCode: string;
      }[];
    }>(
      (acc, { countByWeek }) => {
        const matchingWeek = countByWeek.find(
          coverage => coverage.weekIndex === weekIndex
        );
        if (matchingWeek) {
          acc.coverageOps = acc.coverageOps.concat(matchingWeek.coverageOps);
          acc.stubOps = acc.stubOps.concat(matchingWeek.stubOps);
        }
        return acc;
      },
      { coverageOps: [], stubOps: [] }
    );

    return {
      weekIndex,
      count: intersection(weeklyCount.coverageOps, weeklyCount.stubOps).length,
      total: new Set([...weeklyCount.coverageOps, ...weeklyCount.stubOps]).size,
    };
  });
};

export type ContractStats = {
  weeklyApiCoverage: Awaited<ReturnType<typeof getWeeklyApiCoverageSummary>>;
  weeklyStubUsage: Awaited<ReturnType<typeof getWeeklyStubUsageSummary>>;
  weeklyConsumerProducerSpecAndOps: Awaited<
    ReturnType<typeof getWeeklyConsumerProducerSpecAndOperationsCount>
  >;
};

export const getContractStatsAsChunks = async (
  queryContext: QueryContext,
  onChunk: (x: Partial<ContractStats>) => void
) => {
  const sendChunk =
    <T extends keyof ContractStats>(key: T) =>
    (data: ContractStats[typeof key]) => {
      onChunk({ [key]: data });
    };

  await Promise.all([
    getWeeklyApiCoverageSummary(queryContext).then(sendChunk('weeklyApiCoverage')),
    getWeeklyStubUsageSummary(queryContext).then(sendChunk('weeklyStubUsage')),
    getWeeklyConsumerProducerSpecAndOperationsCount(queryContext).then(
      sendChunk('weeklyConsumerProducerSpecAndOps')
    ),
  ]);
};
