/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { prop } from 'ramda';
import { RepoAnalysis, TopLevelIndicator } from '../../shared-types';
import azure from '../azure';
import aggregateBuildsByRepo from './aggregate-builds-by-repo';
import aggregateBranches from './aggregate-branches';
import aggregatePrs from './aggregate-prs';
import aggregateCoverageByRepo from './aggregate-coverage-by-repo';
import aggregateReleases from './aggregate-releases';
import aggregateCodeQuality from './aggregate-code-quality';
import sonar from '../sonar';
import { Config } from '../types';

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
    getRepositories, getBuilds, getBranches, getPRs,
    getTestRuns, getTestCoverage, getReleases
  } = azure(config);
  const initialiseSonar = sonar(config);

  return async (collectionName: string, projectName: string): Promise<RepoAnalysis[]> => {
    const [
      repos,
      { buildByRepoId, buildByBuildId },
      testRuns,
      releaseByRepoId,
      codeQualityByRepoName
    ] = await Promise.all([
      getRepositories(collectionName, projectName),
      getBuilds(collectionName, projectName).then(aggregateBuildsByRepo),
      getTestRuns(collectionName, projectName),
      getReleases(collectionName, projectName).then(aggregateReleases),
      initialiseSonar(projectName)
    ]);

    const getCoverageByRepoId = aggregateCoverageByRepo(
      testRuns,
      buildByBuildId,
      (buildId: number) => getTestCoverage(collectionName, projectName, buildId)
    );

    return Promise.all(repos.map(async r => {
      const [branches, prs, coverage, { languages, codeQuality }] = await Promise.all([
        getBranches(collectionName, r.id!).then(aggregateBranches),
        getPRs(collectionName, r.id!).then(aggregatePrs),
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
          prs,
          coverage,
          releaseByRepoId(r.id!),
          codeQuality
        ]
      });
    }));
  };
};
