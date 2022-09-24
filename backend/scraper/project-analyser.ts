import debug from 'debug';
import { prop } from 'rambda';
import azure from './network/azure.js';
import aggregateBuilds from './stats-aggregators/builds.js';
import aggregateBranches from './stats-aggregators/branches.js';
import aggregatePrs from './stats-aggregators/prs.js';
import aggregateReleases from './stats-aggregators/releases.js';
import aggregateCodeQuality from './stats-aggregators/code-quality.js';
import aggregateCommits from './stats-aggregators/commits.js';
import aggregatePolicyConfigurations from './stats-aggregators/policy-configurations.js';
import aggregateTestCases from './stats-aggregators/test-cases.js';
import aggregateBuildDefinitions from './stats-aggregators/build-definitions.js';
import sonar from './network/sonar.js';
import type { ProjectAnalysis, WorkItemAnalysis } from './types.js';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config.js';
import aggregateTestRuns from './stats-aggregators/test-runs.js';
import languageColors from './language-colors.js';
import type { RepoAnalysis } from '../../shared/types.js';
import addPipelinesToRepos from './stats-aggregators/add-pipelines-to-repos.js';
import type { GitBranchStats, WorkItemField } from './types-azure.js';
import { startTimer } from '../utils.js';
import { featureTogglesForRepos } from './stats-aggregators/feature-toggles.js';
import { latestBuildReportsForRepoAndBranch } from '../models/build-reports.js';
import {
  buildsByBuildIds, getBuilds, saveBuild
} from '../models/builds.js';
// import { missingTimelines, saveBuildTimeline } from '../models/build-timeline.js';
// import buildTimelines from './stats-aggregators/build-timelines.js';

const getLanguageColor = (lang: string) => {
  if (lang in languageColors) return languageColors[lang as keyof typeof languageColors];
  if (lang === 'js') return languageColors.javascript;
  if (lang === 'xml') return languageColors.eiffel;
  return languageColors.eiffel;
};

const analyserLog = debug('analyser');

export default (config: ParsedConfig) => {
  const {
    getRepositories, getBranchesStats, getPRs, getCommits,
    getTestRuns, getTestCoverage, getReleases, getPolicyConfigurations,
    getProjectWorkItemIdsForQuery, getBuildDefinitions,
    getOneBuildBeforeQueryPeriod // , getBuildTimeline
  } = azure(config);

  return async (
    collection: ParsedCollection,
    projectConfig: ParsedProjectConfig,
    getWorkItems: (projectConfig: ParsedProjectConfig, workItemFieldsPromise: Promise<WorkItemField[]>) => Promise<WorkItemAnalysis>,
    workItemFieldsPromise: Promise<WorkItemField[]>
  ): Promise<ProjectAnalysis> => {
    const time = startTimer();
    const forProject = <T>(fn: (c: string, p: string) => T): T => fn(collection.name, projectConfig.name);

    const codeQualityByRepo = forProject(sonar(config));

    analyserLog(`Starting analysis for ${collection.name}/${projectConfig.name}`);
    const [
      repos,
      builds,
      buildDefinitionsByRepoId,
      releases,
      prByRepoId,
      policyConfigurationByRepoBranch,
      workItemAnalysis,
      testCasesAnalysis
    ] = await Promise.all([
      forProject(getRepositories),
      forProject(getBuilds),
      forProject(getBuildDefinitions).then(aggregateBuildDefinitions),
      forProject(getReleases),
      forProject(getPRs).then(aggregatePrs(config.azure.queryFrom)),
      forProject(getPolicyConfigurations).then(aggregatePolicyConfigurations),
      getWorkItems(projectConfig, workItemFieldsPromise),
      aggregateTestCases(forProject(getProjectWorkItemIdsForQuery), projectConfig.name)
    ]);

    const repoNameById = (id: string) => repos.find(r => r.id === id)?.name;

    // await Promise.all(builds.map(saveBuild(collection.name)));

    // const writeTimelinesToDb = buildTimelines(
    //   builds,
    //   forProject(missingTimelines),
    //   forProject(getBuildTimeline),
    //   forProject(saveBuildTimeline)
    // );

    const { buildsByRepoId, allMasterBuilds } = aggregateBuilds(
      builds,
      buildDefinitionsByRepoId,
      repoNameById,
      forProject(latestBuildReportsForRepoAndBranch),
      projectConfig.templateRepoName
    );

    // TODO: This doesn't belong here
    const getBuildBefore = async (buildDefinitionIds: number[]) => {
      const builds = await forProject(getOneBuildBeforeQueryPeriod)(buildDefinitionIds);
      await Promise.all(builds.map(saveBuild(collection.name)));
      return forProject(buildsByBuildIds)(builds.map(b => b.id));
    };

    const getTestsByRepoId = aggregateTestRuns(
      forProject(getTestRuns),
      forProject(getTestCoverage),
      getBuildBefore,
      allMasterBuilds
    );

    const repoAnalysis: RepoAnalysis[] = await Promise.all(repos.map(async r => {
      const branchStats = r.size === 0
        ? Promise.resolve([])
        : forProject(getBranchesStats)(r.id)
          .catch(error => {
            if (!(error instanceof Error)) throw error;
            if (!error.message.startsWith('HTTP error')) throw error;
            if (error.message.includes('400')) return [] as GitBranchStats[];
            throw error;
          });

      const [
        branches,
        tests,
        { languages, codeQuality },
        commits,
        builds
      ] = await Promise.all([
        branchStats.then(aggregateBranches(r.webUrl, r.defaultBranch)),
        getTestsByRepoId(r.id),
        codeQualityByRepo(r.name, r.defaultBranch).then(aggregateCodeQuality),
        forProject(getCommits)(r.id).then(aggregateCommits),
        buildsByRepoId(r.id)
      ]);

      return {
        name: r.name,
        id: r.id,
        url: r.webUrl,
        defaultBranch: (r.defaultBranch || '').replace('refs/heads/', ''),
        languages: languages?.map(l => ({ ...l, color: getLanguageColor(l.lang) })),
        commits,
        builds,
        branches,
        prs: prByRepoId(r.id),
        tests,
        codeQuality
      };
    }));

    const releaseAnalysis = aggregateReleases(projectConfig, releases, policyConfigurationByRepoBranch);

    const analysisResults: ProjectAnalysis = {
      repoAnalysis: addPipelinesToRepos(releaseAnalysis, repoAnalysis),
      releaseAnalysis,
      workItemAnalysis,
      workItemLabel: projectConfig.workitems.label,
      testCasesAnalysis,
      featureToggles: await featureTogglesForRepos(repos.map(prop('id')))
    };

    // await writeTimelinesToDb;
    analyserLog(`Took ${time()} to analyse ${collection.name}/${projectConfig.name}.`);

    return analysisResults;
  };
};
