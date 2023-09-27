import { asc, byNum } from 'sort-lib';
import { intersection, range } from 'rambda';
import type { FilterQuery, PipelineStage } from 'mongoose';
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
  getOneOlderItem: () => Promise<T | null>,
  weeklyData: ({ weekIndex: number } & T)[],
  emptyValue: T,
  cleanup: (item: T | null | undefined) => T
) => {
  const { startDate, endDate } = fromContext(queryContext);
  const { numberOfIntervals } = createIntervals(startDate, endDate);
  const hasDataForTheFirstWeek = weeklyData.some(item => item.weekIndex === 0);

  const dataByWeek = hasDataForTheFirstWeek
    ? weeklyData
    : await (async () => {
        const olderItem = await getOneOlderItem();
        return [{ weekIndex: 0, ...cleanup(olderItem) }, ...weeklyData];
      })();

  return range(0, numberOfIntervals).reduce<({ weekIndex: number } & T)[]>(
    (acc, weekIndex) => {
      const matchingItem = dataByWeek.find(item => item.weekIndex === weekIndex);
      if (matchingItem) {
        acc.push(matchingItem);
        return acc;
      }

      const lastItem = acc.at(-1);
      acc.push({ weekIndex, ...cleanup(lastItem) });
      return acc;
    },
    [{ weekIndex: 0, ...emptyValue }]
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
          () => getOneOlderApiCoverageForBuildDefinition(queryContext, buildDefId),
          coverageByWeek,
          {
            buildDefinitionId: buildDefId,
            totalOperations: 0,
            coveredOperations: 0,
          },
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
          () => getOneOlderStubUsageForBuildDefinition(queryContext, buildDefId),
          stubUsageByWeek,
          {
            buildDefinitionId: buildDefId,
            totalOperations: 0,
            zeroCountOperations: 0,
          },
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

const filterAndAddSpecsList: PipelineStage[] = [
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
  {
    $addFields: {
      coverageSpecs: {
        $map: {
          input: '$specmaticCoverage',
          as: 'coverage',
          in: '$$coverage.specId',
        },
      },
      stubSpecs: {
        $map: {
          input: '$specmaticStubUsage',
          as: 'stub',
          in: '$$stub.specId',
        },
      },
    },
  },
];

const getConsumerProducerSpecCount = async (queryContext: QueryContext) => {
  const { startDate, endDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    weekIndex: number;
    buildDefinitionId: string;
    coverageSpecs: string[];
    stubSpecs: string[];
  }>([
    buildReportsWithSpecmatic(queryContext, {
      createdAt: inDateRange(startDate, endDate),
      $or: [
        { specmaticCoverage: { $exists: true } },
        { specmaticStubUsage: { $exists: true } },
      ],
    }),
    ...filterAndAddSpecsList,
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: {
          weekIndex: weekIndexValue(startDate, '$createdAt'),
          buildDefinitionId: '$buildDefinitionId',
        },
        coverageSpecs: { $last: { $ifNull: ['$coverageSpecs', []] } },
        stubSpecs: { $last: { $ifNull: ['$stubSpecs', []] } },
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

const getOlderConsumerProducerSpecCountForBuildDefinition = async (
  queryContext: QueryContext,
  buildDefinitionId: string
) => {
  const { startDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    // buildId: string;
    buildDefinitionId: string;
    coverageSpecs: string[];
    stubSpecs: string[];
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
    ...filterAndAddSpecsList,
    {
      $project: {
        _id: 0,
        buildId: 1,
        buildDefinitionId: 1,
        coverageSpecs: 1,
        stubSpecs: 1,
      },
    },
  ]).then(results => (results.length ? results[0] : null));
};

export const getWeeklyConsumerProducerSpecCount = async (queryContext: QueryContext) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const { numberOfIntervals } = createIntervals(startDate, endDate);

  const [consumerProducerSpecCountForDefs, buildDefs] = await Promise.all([
    getConsumerProducerSpecCount(queryContext),
    getBuildDefIds(collectionName, project),
  ]);

  const buildDefsWithConsumerProducerSpecCount = buildDefs.map(buildDef => {
    const matchingConsumerProducerSpecCount = consumerProducerSpecCountForDefs.filter(
      coverage => coverage.buildDefinitionId === buildDef.id.toString()
    );
    return {
      buildDefId: buildDef.id.toString(),
      consumerProducerSpecCountByWeek: matchingConsumerProducerSpecCount.sort(
        asc(byNum(w => w.weekIndex))
      ),
    };
  });

  const continuousConsumerProducerSpecCount = await Promise.all(
    buildDefsWithConsumerProducerSpecCount.map(
      async ({ buildDefId, consumerProducerSpecCountByWeek }) => {
        return {
          buildDefId,
          consumerProducerSpecCountByWeek: await makeContinuous(
            queryContext,
            () =>
              getOlderConsumerProducerSpecCountForBuildDefinition(
                queryContext,
                buildDefId
              ),
            consumerProducerSpecCountByWeek,
            {
              buildDefinitionId: buildDefId,
              coverageSpecs: [],
              stubSpecs: [],
            },
            item => ({
              buildDefinitionId: buildDefId,
              coverageSpecs: item?.coverageSpecs || [],
              stubSpecs: item?.stubSpecs || [],
            })
          ),
        };
      }
    )
  );

  return range(0, numberOfIntervals).map(weekIndex => {
    const weekConsumerProducerSpecCount = continuousConsumerProducerSpecCount.reduce<{
      coverageSpecs: string[];
      stubSpecs: string[];
    }>(
      (acc, { consumerProducerSpecCountByWeek }) => {
        const matchingWeek = consumerProducerSpecCountByWeek.find(
          coverage => coverage.weekIndex === weekIndex
        );
        if (matchingWeek) {
          acc.coverageSpecs = acc.coverageSpecs.concat(matchingWeek.coverageSpecs);
          acc.stubSpecs = acc.stubSpecs.concat(matchingWeek.stubSpecs);
        }
        return acc;
      },
      { coverageSpecs: [], stubSpecs: [] }
    );

    return {
      weekIndex,
      count: intersection(
        weekConsumerProducerSpecCount.coverageSpecs,
        weekConsumerProducerSpecCount.stubSpecs
      ).length,
      total: new Set([
        ...weekConsumerProducerSpecCount.coverageSpecs,
        ...weekConsumerProducerSpecCount.stubSpecs,
      ]).size,
    };
  });
};

export type ContractStats = {
  weeklyApiCoverage: Awaited<ReturnType<typeof getWeeklyApiCoverageSummary>>;
  weeklyStubUsage: Awaited<ReturnType<typeof getWeeklyStubUsageSummary>>;
  weeklyConsumerProducerSpecs: Awaited<
    ReturnType<typeof getWeeklyConsumerProducerSpecCount>
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
    getWeeklyConsumerProducerSpecCount(queryContext).then(
      sendChunk('weeklyConsumerProducerSpecs')
    ),
  ]);
};
