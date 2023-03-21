import { last, range } from 'rambda';
import { z } from 'zod';
import { oneDayInMs } from '../../shared/utils.js';
import { collectionAndProjectInputs, dateRangeInputs } from './helpers.js';
import { BuildDefinitionModel } from './mongoose-models/BuildDefinitionModel.js';
import type { BranchCoverage } from './code-coverage.js';
import { getOldCoverageForDefinition } from './code-coverage.js';
import {
  getCoveragesForRepo,
  getOneOldTestForBuildDefID,
  getTestsForRepo,
} from './tests-coverages.js';

export type TestStatDetails = {
  state: string;
  outcome: string;
  count: number;
};

export type BuildPipelineTests = {
  _id: number;
  collectionName: string;
  project: string;
  repositoryId: string;
  repositoryName: string;
  defaultBranch: string;
  buildId: number;
  sourceBranch: string;
  definitionId: number;
  definitionName: string;
  definitionUrl: string;
  testDuration: number;
  totalTests: number;
  testStats: TestStatDetails[];
  testsName: string;
};
export const TestRunsForRepositoryInputParser = z.object({
  ...collectionAndProjectInputs,
  repositoryId: z.string(),
  ...dateRangeInputs,
});

export type BuildDef = { id: number; name: string; url: string };

export type TestsForWeek = {
  weekIndex: number;
} & (
  | { hasTests: false }
  | {
      hasTests: true;
      totalTests: number;
      startedDate: Date;
      completedDate: Date;
      passedTests: number;
    }
);

export type TestsForDef = {
  definitionId: number;
  tests: TestsForWeek[];
  latest?: TestsForWeek;
};

export type BuildDefWithTests = BuildDef & Partial<TestsForDef>;

export type BuildDefWithTestsAndCoverage = BuildDef &
  Partial<TestsForDef> &
  Partial<BranchCoverage>;

const makeContinuous = async <T extends { weekIndex: number }>(
  tests: T[] | undefined,
  startDate: Date,
  endDate: Date,
  getOneOlderTestRun: () => Promise<T | null>,
  emptyValue: Omit<T, 'weekIndex'>
) => {
  const totalDays = (endDate.getTime() - startDate.getTime()) / oneDayInMs;
  const totalIntervals = Math.floor(totalDays / 7 + (totalDays % 7 === 0 ? 0 : 1));

  if (!tests) {
    const olderTest = await getOneOlderTestRun();
    if (!olderTest) return null;

    return range(0, totalIntervals).map(weekIndex => {
      return { ...olderTest, weekIndex };
    });
  }

  return range(0, totalIntervals)
    .reduce<Promise<T[]>>(async (acc, weekIndex, index) => {
      const matchingTest = tests.find(t => t.weekIndex === weekIndex);

      if (matchingTest) return [...(await acc), matchingTest];

      if (index === 0) {
        const olderTest = await getOneOlderTestRun();

        if (!olderTest) {
          return [{ ...emptyValue, weekIndex } as T];
        }

        return [{ ...olderTest, weekIndex }];
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const lastItem = last(await acc)!;
      return [...(await acc), { ...lastItem, weekIndex }];
    }, Promise.resolve([]))
    .then(list => list.slice(totalIntervals - Math.floor(totalDays / 7)));
};

export const mapDefsTestsAndCoverage = async (
  collectionName: string,
  project: string,
  startDate: Date,
  endDate: Date,
  repositoryId: string
) => {
  const [definitionList, definitionTestRuns, branchCoverage] = await Promise.all([
    BuildDefinitionModel.find(
      {
        collectionName,
        project,
        repositoryId,
      },
      {
        _id: 0,
        id: 1,
        name: 1,
        url: 1,
      }
    ).lean(),
    getTestsForRepo(collectionName, project, repositoryId, startDate, endDate),
    getCoveragesForRepo(collectionName, project, repositoryId, startDate, endDate),
  ]);
  // Mapping the build definitions/pipelines with no testruns
  const buildDefsWithTests: BuildDefWithTests[] = (definitionList as BuildDef[]).map(
    definition => {
      const tests = definitionTestRuns.find(def => def.definitionId === definition.id);
      return { ...definition, ...tests } || definition;
    }
  );

  const buildDefsWithTestsAndCoverage: BuildDefWithTestsAndCoverage[] = (
    buildDefsWithTests as BuildDefWithTests[]
  ).map(definition => {
    const coverage = branchCoverage.find(def => def.definitionId === definition.id);
    return coverage
      ? { ...definition, coverageByWeek: coverage.coverageByWeek }
      : definition;
  });
  return buildDefsWithTestsAndCoverage;
};

export const getTestRunsAndCoverageForRepo = async ({
  collectionName,
  project,
  repositoryId,
  startDate,
  endDate,
}: z.infer<typeof TestRunsForRepositoryInputParser>) => {
  const testRunsAndCoverageForRepo = await mapDefsTestsAndCoverage(
    collectionName,
    project,
    startDate,
    endDate,
    repositoryId
  );
  const getOneOlderTestRunForDef = (defId: number) => () => {
    return getOneOldTestForBuildDefID(
      collectionName,
      project,
      repositoryId,
      defId,
      startDate
    );
  };

  const getOneOlderCoverageForDef = (defId: number) => () => {
    return getOldCoverageForDefinition(
      collectionName,
      project,
      startDate,
      repositoryId,
      defId
    );
  };

  const definitionTestsAndCoverage = Promise.all(
    testRunsAndCoverageForRepo.map(async def => {
      const tests = await makeContinuous(
        def.tests,
        startDate,
        endDate,
        getOneOlderTestRunForDef(def.id),
        { hasTests: false }
      );

      const coverageData = await makeContinuous(
        def.coverageByWeek || undefined,
        startDate,
        endDate,
        getOneOlderCoverageForDef(def.id),
        {
          buildId: 0,
          definitionId: 0,
          hasCoverage: false,
        }
      );

      return {
        ...def,
        url: `${def.url.split('_apis')[0]}_build/definition?definitionId=${def.id}`,
        tests,
        coverageByWeek: coverageData,
        latestTest: tests ? last(tests) : null,
        latestCoverage: coverageData ? last(coverageData) : null,
      };
    })
  );
  return definitionTestsAndCoverage;
};
