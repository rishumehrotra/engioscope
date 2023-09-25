import { asc, byNum } from 'sort-lib';
import { range } from 'rambda';
import type { FilterQuery, PipelineStage } from 'mongoose';
import { inDateRange } from './helpers.js';
import type { QueryContext } from './utils.js';
import { fromContext, weekIndexValue } from './utils.js';
import { createIntervals } from '../utils.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import { AzureBuildReportModel } from './build-reports.js';

const matchSpecmatic = (
  queryContext: QueryContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalClauses: FilterQuery<any>[] = []
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
    matchSpecmatic(queryContext, [
      { createdAt: inDateRange(startDate, endDate) },
      { specmaticCoverage: { $exists: true } },
    ]),
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
    buildId: string;
    buildDefinitionId: string;
    totalOperations: number;
    coveredOperations: number;
    createdAt: Date;
  }>([
    matchSpecmatic(queryContext, [
      { buildDefinitionId },
      { createdAt: { $lt: startDate } },
      { specmaticCoverage: { $exists: true } },
    ]),
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
const makeApiCoverageContinuous = async (
  queryContext: QueryContext,
  buildDefId: string,
  coverageByWeek: ApiCoverage[],
  numberOfIntervals: number
) => {
  const hasFirstWeekCoverage = coverageByWeek.some(coverage => coverage.weekIndex === 0);

  const weeklyCoverage = hasFirstWeekCoverage
    ? coverageByWeek
    : await (async () => {
        const olderCoverage = await getOneOlderApiCoverageForBuildDefinition(
          queryContext,
          buildDefId
        );

        return [
          {
            weekIndex: 0,
            buildDefinitionId: buildDefId,
            totalOperations: olderCoverage?.totalOperations || 0,
            coveredOperations: olderCoverage?.coveredOperations || 0,
          },
          ...coverageByWeek,
        ];
      })();

  return range(0, numberOfIntervals).reduce<
    {
      weekIndex: number;
      buildDefinitionId: string;
      totalOperations: number;
      coveredOperations: number;
    }[]
  >(
    (acc, weekIndex) => {
      const matchingCoverage = weeklyCoverage.find(
        coverage => coverage.weekIndex === weekIndex
      );
      if (matchingCoverage) {
        acc.push(matchingCoverage);
        return acc;
      }

      const lastCoverage = acc.at(-1);
      acc.push({
        weekIndex,
        buildDefinitionId: buildDefId,
        totalOperations: lastCoverage?.totalOperations || 0,
        coveredOperations: lastCoverage?.coveredOperations || 0,
      });
      return acc;
    },
    [
      {
        weekIndex: 0,
        buildDefinitionId: buildDefId,
        totalOperations: 0,
        coveredOperations: 0,
      },
    ]
  );
};

export const getWeeklyApiCoverageSummary = async (queryContext: QueryContext) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const { numberOfIntervals } = createIntervals(startDate, endDate);

  const [apiCoveragesForDefs, buildDefs] = await Promise.all([
    getWeeklyApiCoveragePercentage(queryContext),
    BuildDefinitionModel.find({ collectionName, project }, { id: 1, _id: 0 }) as Promise<
      { id: string }[]
    >,
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
        coverageByWeek: await makeApiCoverageContinuous(
          queryContext,
          buildDefId,
          coverageByWeek,
          numberOfIntervals
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
  { $addFields: { specmaticStubs: { $size: '$specmaticStubUsage' } } },
  { $unwind: '$specmaticStubUsage' },
  { $match: { 'specmaticCoverage.serviceType': 'HTTP' } },
  {
    $addFields: {
      operationsCount: { $sum: '$specmaticStubUsage.operations.count' },
      totalOperations: { $size: '$specmaticCoverage.operations' },
      zeroCountOperations: {
        $size: {
          $filter: {
            input: '$specmaticCoverage.operations',
            as: 'operation',
            cond: { $eq: ['$$operation.count', 0] },
          },
        },
      },
    },
  },
];

const getStubUsage = async (queryContext: QueryContext) => {
  const { startDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    weekIndex: number;
    buildDefinitionId: string;
    operationsCount: number;
    specmaticStubs: number;
    totalOperations: number;
    zeroCountOperations: number;
  }>([
    matchSpecmatic(queryContext, [
      { createdAt: { $lt: startDate } },
      { specmaticStubUsage: { $exists: true } },
    ]),
    ...addFieldsStubUsage,
    {
      $group: {
        _id: '$buildId',
        buildDefinitionId: { $first: '$buildDefinitionId' },
        specmaticStubs: { $first: '$specmaticStubs' },
        operationsCount: { $sum: '$operationsCount' },
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
        operationsCount: { $last: '$operationsCount' },
        specmaticStubs: { $last: '$specmaticStubs' },
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
  return AzureBuildReportModel.aggregate<{
    buildId: string;
    buildDefinitionId: string;
    operationsCount: number;
    specmaticStubs: number;
    totalOperations: number;
    zeroCountOperations: number;
    createdAt: Date;
  }>([
    matchSpecmatic(queryContext, [
      { buildDefinitionId },
      { specmaticStubUsage: { $exists: true } },
    ]),
    { $sort: { createdAt: -1 } },
    { $limit: 1 },
    ...addFieldsStubUsage,
    {
      $group: {
        _id: '$buildId',
        buildDefinitionId: { $first: '$buildDefinitionId' },
        specmaticStubs: { $first: '$specmaticStubs' },
        operationsCount: { $sum: '$operationsCount' },
        totalOperations: { $sum: '$totalOperations' },
        zeroCountOperations: { $sum: '$zeroCountOperations' },
        createdAt: { $first: '$createdAt' },
      },
    },
    { $addFields: { buildId: '$_id' } },
    { $project: { _id: 0 } },
  ]).then(results => (results.length ? results[0] : null));
};

const makeStubUsageContinuous = async (
  queryContext: QueryContext,
  buildDefId: string,
  stubUsageByWeek: {
    weekIndex: number;
    buildDefinitionId: string;
    operationsCount: number;
    specmaticStubs: number;
    totalOperations: number;
    zeroCountOperations: number;
  }[],
  numberOfIntervals: number
) => {
  const hasFirstWeekStubUsage = stubUsageByWeek.some(
    coverage => coverage.weekIndex === 0
  );

  const weeklyStubUsage = hasFirstWeekStubUsage
    ? stubUsageByWeek
    : await (async () => {
        const olderStubUsage = await getOneOlderStubUsageForBuildDefinition(
          queryContext,
          buildDefId
        );

        return [
          {
            weekIndex: 0,
            buildDefinitionId: buildDefId,
            operationsCount: olderStubUsage?.operationsCount || 0,
            specmaticStubs: olderStubUsage?.specmaticStubs || 0,
            totalOperations: olderStubUsage?.totalOperations || 0,
            zeroCountOperations: olderStubUsage?.zeroCountOperations || 0,
          },
          ...stubUsageByWeek,
        ];
      })();

  return range(0, numberOfIntervals).reduce<
    {
      weekIndex: number;
      buildDefinitionId: string;
      operationsCount: number;
      specmaticStubs: number;
      totalOperations: number;
      zeroCountOperations: number;
    }[]
  >(
    (acc, weekIndex) => {
      const matchingStubUsage = weeklyStubUsage.find(
        coverage => coverage.weekIndex === weekIndex
      );
      if (matchingStubUsage) {
        acc.push(matchingStubUsage);
        return acc;
      }

      const lastStubUsage = acc.at(-1);
      acc.push({
        weekIndex,
        buildDefinitionId: buildDefId,
        operationsCount: lastStubUsage?.operationsCount || 0,
        specmaticStubs: lastStubUsage?.specmaticStubs || 0,
        totalOperations: lastStubUsage?.totalOperations || 0,
        zeroCountOperations: lastStubUsage?.zeroCountOperations || 0,
      });
      return acc;
    },
    [
      {
        weekIndex: 0,
        buildDefinitionId: buildDefId,
        operationsCount: 0,
        specmaticStubs: 0,
        totalOperations: 0,
        zeroCountOperations: 0,
      },
    ]
  );
};

export const getWeeklyStubUsageSummary = async (queryContext: QueryContext) => {
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);
  const { numberOfIntervals } = createIntervals(startDate, endDate);

  const [stubUsageForDefs, buildDefs] = await Promise.all([
    getStubUsage(queryContext),
    BuildDefinitionModel.find({ collectionName, project }, { id: 1, _id: 0 }) as Promise<
      { id: string }[]
    >,
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
        stubUsageByWeek: await makeStubUsageContinuous(
          queryContext,
          buildDefId,
          stubUsageByWeek,
          numberOfIntervals
        ),
      };
    })
  );

  return range(0, numberOfIntervals).map(weekIndex => {
    const weekStubUsage = continuousStubUsage.reduce<{
      operationsCount: number;
      specmaticStubs: number;
      totalOperations: number;
      zeroCountOperations: number;
    }>(
      (acc, { stubUsageByWeek }) => {
        const matchingStubUsage = stubUsageByWeek.find(
          coverage => coverage.weekIndex === weekIndex
        );
        if (matchingStubUsage) {
          acc.operationsCount += matchingStubUsage.operationsCount;
          acc.specmaticStubs += matchingStubUsage.specmaticStubs;
          acc.totalOperations += matchingStubUsage.totalOperations;
          acc.zeroCountOperations += matchingStubUsage.zeroCountOperations;
        }
        return acc;
      },
      {
        operationsCount: 0,
        specmaticStubs: 0,
        totalOperations: 0,
        zeroCountOperations: 0,
      }
    );

    return {
      weekIndex,
      operationsCount: weekStubUsage.operationsCount,
      specmaticStubs: weekStubUsage.specmaticStubs,
      totalOperations: weekStubUsage.totalOperations,
      zeroCountOperations: weekStubUsage.zeroCountOperations,
    };
  });
};

export type ContractStats = {
  weeklyApiCoverage: Awaited<ReturnType<typeof getWeeklyApiCoverageSummary>>;
  weeklyStubUsage: Awaited<ReturnType<typeof getWeeklyStubUsageSummary>>;
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
  ]);
};
