import { add, applySpec, identity, multiply, sum } from 'rambda';
import { asc, byString } from 'sort-lib';
import { count, incrementBy } from './reducer-utils.js';
import type { QualityGateStatus, RepoAnalysis, UIBuildPipeline } from './types';
import { addColumnsInArray, combineColumnsInArray, divide, exists } from './utils.js';

export const isInactive = (repo: RepoAnalysis) =>
  (repo.builds?.count || 0) === 0 && repo.commits.count === 0;

export const numberOfTests = (repo: RepoAnalysis) =>
  repo.tests?.reduce((acc, p) => acc + p.successful + p.failed, 0) || 0;

export const numberOfBuilds = (repo: RepoAnalysis) => repo.builds?.count || 0;

export const totalTests = count(incrementBy(numberOfTests));
export const totalBuilds = count(incrementBy(numberOfBuilds));

export const totalTestsByWeek = (repos: RepoAnalysis[]) =>
  addColumnsInArray(
    repos
      .map(r => r.tests)
      .filter(exists)
      .map(r => addColumnsInArray(r.map(p => p.testsByWeek)))
  );

export const totalBuildsByWeek = (repos: RepoAnalysis[]) =>
  addColumnsInArray(
    repos.flatMap(r => r.builds?.pipelines.map(p => p.buildsByWeek)).filter(exists)
  );

export const totalSuccessfulBuildsByWeek = (repos: RepoAnalysis[]) =>
  combineColumnsInArray(
    (a?: { success: number; total: number }, b?: { success: number; total: number }) => {
      if (!a) return b;
      if (!b) return a;
      return {
        success: add(a.success, b.success),
        total: add(a.total, b.total),
      };
    }
  )(
    repos
      .flatMap(r => r.builds?.pipelines)
      .filter(exists)
      .map(
        p =>
          p.successesByWeek?.map((success, i) => ({
            success,
            total: p.buildsByWeek?.[i] || 0,
          }))
      )
      .filter(exists)
  ).map(r =>
    r ? divide(r.success, r.total).map(multiply(100)).map(Math.round).getOr(0) : 0
  );

const isBeforeEndOfWeekFilters = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(
  weekIndex => {
    const date = new Date();
    date.setDate(date.getDate() - (weekIndex - 1) * 7);
    return (d: string) => new Date(d) < date;
  }
);

export const newSonarSetupsByWeek = (repos: RepoAnalysis[]) =>
  repos
    .map(
      r =>
        r.codeQuality
          ?.map(q => q?.oldestFoundSample?.toString())
          .filter(exists)
          .sort(asc(byString(identity)))[0]
    )
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .map(q => isBeforeEndOfWeekFilters.map(f => f(q!)))
    .reduce<number[]>((acc, row) => {
      row.forEach((val, index) => {
        acc[index] = (acc[index] || 0) + (val ? 1 : 0);
      });
      return acc;
    }, []);

const sonarCountByWeek = (value: QualityGateStatus) => (repos: RepoAnalysis[]) =>
  repos
    .flatMap(r => r.codeQuality)
    .map(q => q?.qualityGateByWeek)
    .reduce<{ count: number; total: number }[]>((acc, row) => {
      row?.forEach((val, index) => {
        acc[index] = acc[index] || { count: 0, total: 0 };
        if (val === value) {
          acc[index].count += 1;
        } else if (val === null && index > 0 && row[index - 1] === value) {
          acc[index].count += 1;
        }
        acc[index].total += val === null ? 0 : 1;
      });
      return acc;
    }, [])
    .map(({ count, total }) => (total === 0 ? 0 : Math.round((count * 100) / total)));

const coverage = (repo: RepoAnalysis) =>
  repo.tests?.reduce(
    (acc, p) => {
      if (!p.coverage?.covered) return acc;

      acc.covered += p.coverage.covered;
      acc.total += p.coverage.total;

      return acc;
    },
    { total: 0, covered: 0 }
  );

export const totalCoverage = (repos: RepoAnalysis[]) =>
  repos.reduce(
    (acc, repo) => {
      const cov = coverage(repo);
      if (!cov) return acc;
      acc.covered += cov.covered;
      acc.total += cov.total;
      return acc;
    },
    { total: 0, covered: 0 }
  );

export const totalCoverageByWeek = (repos: RepoAnalysis[]) =>
  combineColumnsInArray<{ covered: number; total: number } | null>((a, b) => {
    if (!b) return a;
    if (!a) return b;
    return {
      covered: a.covered + b.covered,
      total: a.total + b.total,
    };
  })(repos.flatMap(r => r.tests?.map(t => t.coverageByWeek)).filter(exists)).map(c => {
    if (!c) return 0;
    return divide(c.covered, c.total).map(multiply(100)).map(Math.round).getOr(0);
  });

export const sonarCountsByWeek = applySpec({
  pass: sonarCountByWeek('pass'),
  fail: sonarCountByWeek('fail'),
  warn: sonarCountByWeek('warn'),
});

export const totalUsingCentralTemplate = (repos: RepoAnalysis[]) => {
  const pipelines = repos.flatMap(r => r.builds?.pipelines);
  const usingCentralTemplate = sum(
    pipelines.filter(exists).map(p => p.centralTemplateRuns)
  );

  return {
    count: usingCentralTemplate,
    total: sum(pipelines.filter(exists).map(p => p?.count)),
  };
};

export const buildPipelines = (repos: RepoAnalysis[]) =>
  repos.flatMap(r => r.builds?.pipelines).filter(exists);

export const isYmlPipeline = (pipeline: UIBuildPipeline) => pipeline.type === 'yml';

export const hasPipeline = (repos: RepoAnalysis) => (repos.pipelineCount || 0) > 0;

export const reposWithPipelines = (repos: RepoAnalysis[]) => repos.filter(hasPipeline);

export const healthyBranches = (repos: RepoAnalysis[]) =>
  repos.reduce<{ count: number; total: number }>(
    (acc, repo) => {
      acc.count += repo.branches.healthy.count;
      acc.total += repo.branches.total;
      return acc;
    },
    { count: 0, total: 0 }
  );
