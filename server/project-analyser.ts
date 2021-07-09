/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { prop } from 'ramda';
import debug from 'debug';
import { RepoAnalysis, TopLevelIndicator } from '../shared-types';
import azure from './network/azure';
import aggregateBuildsByRepo from './stats-aggregators/aggregate-builds-by-repo';
import aggregateBranches from './stats-aggregators/aggregate-branches';
import aggregatePrs from './stats-aggregators/aggregate-prs';
import aggregateCoverageByRepo from './stats-aggregators/aggregate-coverage-by-repo';
import aggregateReleases from './stats-aggregators/aggregate-releases';
import aggregateCodeQuality from './stats-aggregators/aggregate-code-quality';
import sonar from './network/sonar';
import { Config } from './types';

const scrapeLog = debug('scraper');

const ratingWeightage = {
  Branches: {
    default: 0.25,
    withoutSonar: 0.29
  },
  PR: {
    default: 0.1,
    withoutSonar: 0.14
  },
  Builds: {
    default: 0.15,
    withoutSonar: 0.19
  },
  'Code quality': {
    default: 0.2,
    withoutSonar: 0
  },
  Releases: {
    default: 0.15,
    withoutSonar: 0.19
  },
  'Test coverage': {
    default: 0.15,
    withoutSonar: 0.19
  }
} as const;

const computeRating = (indicators: TopLevelIndicator[]) => {
  const isWithoutSonar = indicators.find(indicator => indicator.name === 'Code quality')!.rating === 0;
  const weightage = prop(isWithoutSonar ? 'withoutSonar' : 'default');

  return Math.round(indicators.reduce((acc, indicator) => (
    acc + weightage(ratingWeightage[indicator.name as keyof typeof ratingWeightage]) * indicator.rating
  ), 0));
};

const withOverallRating = (repoAnalysis: Omit<RepoAnalysis, 'rating'>): RepoAnalysis => ({
  ...repoAnalysis,
  rating: computeRating(repoAnalysis.indicators)
});

export default (config: Config) => {
  const {
    getRepositories, getBuilds, getBranchesStats, getPRs,
    getTestRuns, getTestCoverage, getReleases
  } = azure(config);
  const codeQualityByRepoName = sonar(config);

  return async (collectionName: string, projectName: string): Promise<RepoAnalysis[]> => {
    const startTime = Date.now();
    scrapeLog(`Starting analysis for ${collectionName}/${projectName}`);
    const [
      repos,
      { buildByRepoId, buildByBuildId },
      testRuns,
      releaseByRepoId,
      prByRepoId
    ] = await Promise.all([
      getRepositories(collectionName, projectName),
      getBuilds(collectionName, projectName).then(aggregateBuildsByRepo),
      getTestRuns(collectionName, projectName),
      getReleases(collectionName, projectName).then(aggregateReleases),
      getPRs(collectionName, projectName).then(aggregatePrs)
    ]);

    const getCoverageByRepoId = aggregateCoverageByRepo(
      testRuns,
      buildByBuildId,
      (buildId: number) => getTestCoverage(collectionName, projectName, buildId)
    );

    const analysisResults = await Promise.all(repos.map(async r => {
      const [branches, coverage, { languages, codeQuality }] = await Promise.all([
        (r.size === 0
          ? Promise.resolve([])
          : getBranchesStats(collectionName, projectName, r.id!))
          .then(aggregateBranches),
        getCoverageByRepoId(r.id),
        codeQualityByRepoName(r.name!).then(aggregateCodeQuality)
        // getCommits(collectionName, r.id!)
      ]);

      return withOverallRating({
        name: r.name!,
        id: r.id!,
        languages,
        indicators: [
          buildByRepoId(r.id),
          branches,
          prByRepoId(r.id),
          coverage,
          releaseByRepoId(r.id!),
          codeQuality
        ]
      });
    }));

    scrapeLog(`Took ${Date.now() - startTime}ms to analyse ${collectionName}/${projectName}.`);

    return analysisResults;
  };
};
