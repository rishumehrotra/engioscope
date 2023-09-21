import { asc, byNum } from 'sort-lib';
import { range } from 'rambda';
import { inDateRange } from './helpers.js';
import type { QueryContext } from './utils.js';
import { fromContext, weekIndexValue } from './utils.js';
import { createIntervals } from '../utils.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import { AzureBuildReportModel } from './build-reports.js';

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
  const { collectionName, project, startDate, endDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<ApiCoverage>([
    {
      $match: {
        collectionName,
        project,
        createdAt: inDateRange(startDate, endDate),
        specmaticConfigPath: { $exists: true },
        specmaticCoverage: { $exists: true },
      },
    },
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
  const { collectionName, project, startDate } = fromContext(queryContext);

  return AzureBuildReportModel.aggregate<{
    buildId: string;
    buildDefinitionId: string;
    totalOperations: number;
    coveredOperations: number;
    createdAt: Date;
  }>([
    {
      $match: {
        collectionName,
        project,
        buildDefinitionId,
        createdAt: { $lt: startDate },
        specmaticConfigPath: { $exists: true },
        specmaticCoverage: { $exists: true },
      },
    },
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
