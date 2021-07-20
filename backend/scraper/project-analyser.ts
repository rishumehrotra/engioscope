import { prop } from 'rambda';
import debug from 'debug';
import { RepoAnalysis, TopLevelIndicator } from '../../shared/types';
import azure from './network/azure';
import aggregateBuilds from './stats-aggregators/builds';
import aggregateBranches from './stats-aggregators/branches';
import aggregatePrs from './stats-aggregators/prs';
import aggregateReleases from './stats-aggregators/releases';
import aggregateCodeQuality from './stats-aggregators/code-quality';
import aggregateReleaseDefinitions from './stats-aggregators/release-definitions';
import sonar from './network/sonar';
import { Config, ProjectAnalysis } from './types';
import aggregateTestRunsByBuildId from './stats-aggregators/test-runs';
import { ratingWeightage } from './rating-config';

const analyserLog = debug('analyser');

const computeRating = (indicators: TopLevelIndicator[]) => {
  const isWithoutSonar = indicators.find(indicator => indicator.name === 'Code quality')?.rating === 0;
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
      { buildByRepoId, latestMasterBuilds },
      testRunGetter,
      releaseDefinitionById,
      releases,
      prByRepoId
    ] = await Promise.all([
      forProject(getRepositories),
      forProject(getBuilds).then(aggregateBuilds),
      forProject(getTestRuns).then(aggregateTestRunsByBuildId),
      forProject(getReleaseDefinitions).then(aggregateReleaseDefinitions),
      forProject(getReleases),
      forProject(getPRs).then(aggregatePrs(config))
    ]);

    const getTestsByRepoId = testRunGetter(
      latestMasterBuilds, forProject(getTestCoverage)
    );

    const repoAnalysis = await Promise.all(repos.map(async r => {
      const [
        branches,
        coverage,
        { languages, codeQuality }
      ] = await Promise.all([
        (r.size === 0 ? Promise.resolve([]) : forProject(getBranchesStats)(r.id))
          .then(aggregateBranches),
        getTestsByRepoId(r.id),
        codeQualityByRepoName(r.name).then(aggregateCodeQuality)
      ]);

      return withOverallRating({
        name: r.name,
        id: r.id,
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

    const analysisResults = {
      repoAnalysis,
      releaseAnalysis: aggregateReleases(releaseDefinitionById, releases)
    };

    analyserLog(`Took ${Date.now() - startTime}ms to analyse ${collectionName}/${projectName}.`);

    return analysisResults;
  };
};
