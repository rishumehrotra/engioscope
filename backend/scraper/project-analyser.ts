import debug from 'debug';
import azure from './network/azure';
import aggregateBuilds from './stats-aggregators/builds';
import aggregateBranches from './stats-aggregators/branches';
import aggregatePrs from './stats-aggregators/prs';
import aggregateReleases from './stats-aggregators/releases';
import aggregateCodeQuality from './stats-aggregators/code-quality';
import aggregateCommits from './stats-aggregators/commits';
import aggregatePolicyConfigurations from './stats-aggregators/policy-configurations';
import aggregateTestCases from './stats-aggregators/test-cases';
import aggregateBuildDefinitions from './stats-aggregators/build-definitions';
import sonar from './network/sonar';
import type { ProjectAnalysis, WorkItemAnalysis } from './types';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config';
import aggregateTestRuns from './stats-aggregators/test-runs';
import languageColors from './language-colors';
import type { RepoAnalysis } from '../../shared/types';
import addPipelinesToRepos from './stats-aggregators/add-pipelines-to-repos';
import type { GitBranchStats, WorkItemField } from './types-azure';
import { startTimer } from '../utils';
import parseBuildReports from './parse-build-reports';

const getLanguageColor = (lang: string) => {
  if (lang in languageColors) return languageColors[lang as keyof typeof languageColors];
  if (lang === 'js') return languageColors.javascript;
  if (lang === 'xml') return languageColors.eiffel;
  return languageColors.eiffel;
};

const analyserLog = debug('analyser');

export default (config: ParsedConfig) => {
  const {
    getRepositories, getBuilds, getBranchesStats, getPRs, getCommits,
    getTestRuns, getTestCoverage, getReleases, getPolicyConfigurations,
    getProjectWorkItemIdsForQuery, getBuildDefinitions,
    getOneBuildBeforeQueryPeriod
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

    const { buildsByRepoId, allMasterBuilds } = aggregateBuilds(
      builds, buildDefinitionsByRepoId, repoNameById, forProject(parseBuildReports), projectConfig.templateRepoName
    );

    const getTestsByRepoId = aggregateTestRuns(
      forProject(getTestRuns), forProject(getTestCoverage),
      forProject(getOneBuildBeforeQueryPeriod), allMasterBuilds
    );

    const repoAnalysis: RepoAnalysis[] = await Promise.all(repos.map(async r => {
      const branchStats = r.size === 0
        ? Promise.resolve([])
        : forProject(getBranchesStats)(r.id)
          .catch(e => {
            if (!(e instanceof Error)) throw e;
            if (!e.message.startsWith('HTTP error')) throw e;
            if (e.message.includes('400')) return [] as GitBranchStats[];
            throw e;
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
      testCasesAnalysis
    };

    analyserLog(`Took ${time()} to analyse ${collection.name}/${projectConfig.name}.`);

    return analysisResults;
  };
};
