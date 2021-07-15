/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { prop } from 'ramda';
import debug from 'debug';
import { RepoAnalysis, TopLevelIndicator } from '../shared-types';
import azure from './network/azure';
import aggregateBuilds from './stats-aggregators/aggregate-builds';
import aggregateBranches from './stats-aggregators/aggregate-branches';
import aggregatePrs from './stats-aggregators/aggregate-prs';
import aggregateTestsByRepo from './stats-aggregators/aggregate-tests-by-repo';
import aggregateReleases from './stats-aggregators/aggregate-releases-2';
import aggregateCodeQuality from './stats-aggregators/aggregate-code-quality';
import aggregateReleaseDefinitions from './stats-aggregators/aggregate-release-definitions';
import sonar from './network/sonar';
import { Config, ProjectAnalysis } from './types';

const analyserLog = debug('analyser');

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
    getTestRuns, getTestCoverage, getReleases, getReleaseDefinitions
  } = azure(config);
  const codeQualityByRepoName = sonar(config);

  return async (collectionName: string, projectName: string): Promise<ProjectAnalysis> => {
    const startTime = Date.now();
    const forProject = <T>(fn: (c: string, p: string) => T): T => fn(collectionName, projectName);

    analyserLog(`Starting analysis for ${collectionName}/${projectName}`);
    const [
      repos,
      { buildByRepoId, buildByBuildId },
      testRuns,
      releaseDefinitionById,
      releases,
      prByRepoId
    ] = await Promise.all([
      forProject(getRepositories),
      forProject(getBuilds).then(aggregateBuilds),
      forProject(getTestRuns),
      forProject(getReleaseDefinitions).then(aggregateReleaseDefinitions),
      forProject(getReleases),
      forProject(getPRs).then(aggregatePrs(config))
    ]);

    const getTestsByRepoId = aggregateTestsByRepo(
      testRuns, buildByBuildId, forProject(getTestCoverage)
    );

    const repoData = Promise.all(repos.map(async r => {
      const [
        branches,
        coverage,
        { languages, codeQuality }
      ] = await Promise.all([
        (r.size === 0 ? Promise.resolve([]) : forProject(getBranchesStats)(r.id!))
          .then(aggregateBranches),
        getTestsByRepoId(r.id),
        codeQualityByRepoName(r.name!).then(aggregateCodeQuality)
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
          codeQuality
        ]
      });
    }));

    const [repoAnalysis] = await Promise.all([
      repoData
    ]);

    const analysisResults = {
      repoAnalysis,
      releaseAnalysis: aggregateReleases(releaseDefinitionById, releases)
    };

    analyserLog(`Took ${Date.now() - startTime}ms to analyse ${collectionName}/${projectName}.`);

    return analysisResults;
  };
};
