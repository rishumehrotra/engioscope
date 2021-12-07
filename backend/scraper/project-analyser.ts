import debug from 'debug';
import azure from './network/azure';
import aggregateBuilds from './stats-aggregators/builds';
import aggregateBranches from './stats-aggregators/branches';
import aggregatePrs from './stats-aggregators/prs';
import aggregateReleases from './stats-aggregators/releases';
import aggregateCodeQuality from './stats-aggregators/code-quality';
import aggregateCommits from './stats-aggregators/commits';
import aggregateReleaseDefinitions from './stats-aggregators/release-definitions';
import aggregatePolicyConfigurations from './stats-aggregators/policy-configurations';
import sonar from './network/sonar';
import type { ProjectAnalysis, WorkItemAnalysis } from './types';
import type { ParsedCollection, ParsedConfig, ParsedProjectConfig } from './parse-config';
import aggregateTestRuns from './stats-aggregators/test-runs';
import languageColors from './language-colors';
import type { RepoAnalysis } from '../../shared/types';
import addPipelinesToRepos from './stats-aggregators/add-pipelines-to-repos';
import type { WorkItemField } from './types-azure';

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
    getTestRuns, getTestCoverage, getReleases, getReleaseDefinitions,
    getPolicyConfigurations
  } = azure(config);
  const codeQualityByRepoName = sonar(config);

  return async (
    collection: ParsedCollection,
    projectConfig: ParsedProjectConfig,
    getWorkItems: (projectConfig: ParsedProjectConfig, workItemFieldsPromise: Promise<WorkItemField[]>) => Promise<WorkItemAnalysis>,
    workItemFieldsPromise: Promise<WorkItemField[]>
  ): Promise<ProjectAnalysis> => {
    const startTime = Date.now();
    const forProject = <T>(fn: (c: string, p: string) => T): T => fn(collection.name, projectConfig.name);

    analyserLog(`Starting analysis for ${collection.name}/${projectConfig.name}`);
    const [
      repos,
      { buildsByRepoId, latestMasterBuilds },
      releaseDefinitionById,
      releases,
      prByRepoId,
      policyConfigurationByRepoBranch,
      workItemAnalysis
    ] = await Promise.all([
      forProject(getRepositories),
      forProject(getBuilds).then(aggregateBuilds),
      forProject(getReleaseDefinitions).then(aggregateReleaseDefinitions),
      forProject(getReleases),
      forProject(getPRs).then(aggregatePrs(config.azure.queryFrom)),
      forProject(getPolicyConfigurations).then(aggregatePolicyConfigurations),
      getWorkItems(projectConfig, workItemFieldsPromise)
    ]);

    const getTestsByRepoId = aggregateTestRuns(
      forProject(getTestRuns), forProject(getTestCoverage), latestMasterBuilds
    );

    const repoAnalysis: RepoAnalysis[] = await Promise.all(repos.map(async r => {
      const [
        branches,
        tests,
        { languages, codeQuality },
        commits
      ] = await Promise.all([
        (r.size === 0 ? Promise.resolve([]) : forProject(getBranchesStats)(r.id))
          .then(aggregateBranches(r.webUrl, r.defaultBranch)),
        getTestsByRepoId(r.id),
        codeQualityByRepoName(r.name).then(aggregateCodeQuality),
        forProject(getCommits)(r.id).then(aggregateCommits)
      ]);

      return {
        name: r.name,
        id: r.id,
        url: r.webUrl,
        defaultBranch: (r.defaultBranch || '').replace('refs/heads/', ''),
        languages: languages?.map(l => ({ ...l, color: getLanguageColor(l.lang) })),
        commits,
        builds: buildsByRepoId(r.id),
        branches,
        prs: prByRepoId(r.id),
        tests,
        codeQuality
      };
    }));

    const releaseAnalysis = aggregateReleases(
      releaseDefinitionById, releases, policyConfigurationByRepoBranch
    );

    const analysisResults: ProjectAnalysis = {
      repoAnalysis: addPipelinesToRepos(releaseAnalysis, repoAnalysis),
      releaseAnalysis,
      workItemAnalysis,
      workItemLabel: projectConfig.workitems.label
    };

    analyserLog(`Took ${Date.now() - startTime}ms to analyse ${collection.name}/${projectConfig.name}.`);

    return analysisResults;
  };
};
