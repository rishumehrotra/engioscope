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
import type {
  ParsedCollection,
  ParsedConfig,
  ParsedProjectConfig,
} from './parse-config.js';
import aggregateTestRuns from './stats-aggregators/test-runs.js';
import type { RepoAnalysis } from '../../shared/types.js';
import addPipelinesToRepos from './stats-aggregators/add-pipelines-to-repos.js';
import { startTimer } from '../utils.js';
import { featureTogglesForRepos } from './stats-aggregators/feature-toggles.js';
import { centralBuildTemplateBuildCount } from '../models/build-reports.js';
import { getBuilds, getOneBuildBeforeQueryPeriod } from '../models/builds.js';
import { getRepositories } from '../models/repos.js';
import { getReleases } from '../models/releases.js';
import { getPolicyConfigurations } from '../models/policy-configuration.js';
import { getBuildDefinitionsForProject } from '../models/build-definitions.js';
import { branchStatsForRepo } from '../models/branches.js';
import { getCommits } from '../models/commits.js';
import { getLanguageColor } from '../language-colors.js';

const analyserLog = debug('analyser');

export default (config: ParsedConfig) => {
  const { getPRs, getTestRuns, getTestCoverage, getProjectWorkItemIdsForQuery } =
    azure(config);

  return async (
    collection: ParsedCollection,
    projectConfig: ParsedProjectConfig,
    getWorkItems: (projectConfig: ParsedProjectConfig) => Promise<WorkItemAnalysis>
  ): Promise<ProjectAnalysis> => {
    const time = startTimer();
    const forProject = <T>(fn: (c: string, p: string) => T): T =>
      fn(collection.name, projectConfig.name);

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
      testCasesAnalysis,
    ] = await Promise.all([
      forProject(getRepositories),
      forProject(getBuilds),
      forProject(getBuildDefinitionsForProject).then(aggregateBuildDefinitions),
      forProject(getReleases),
      forProject(getPRs).then(aggregatePrs(config.azure.queryFrom)),
      forProject(getPolicyConfigurations).then(aggregatePolicyConfigurations),
      getWorkItems(projectConfig),
      aggregateTestCases(forProject(getProjectWorkItemIdsForQuery), projectConfig.name),
    ]);

    const { buildsByRepoId, allMasterBuilds } = aggregateBuilds(
      builds,
      buildDefinitionsByRepoId,
      repos,
      forProject(centralBuildTemplateBuildCount)
    );

    const getTestsByRepoId = aggregateTestRuns(
      forProject(getTestRuns),
      forProject(getTestCoverage),
      forProject(getOneBuildBeforeQueryPeriod),
      allMasterBuilds
    );

    const repoAnalysis: RepoAnalysis[] = await Promise.all(
      repos.map(async r => {
        const branchStats = forProject(branchStatsForRepo)(r.id);

        const [branches, tests, { languages, codeQuality }, commits, builds] =
          await Promise.all([
            branchStats.then(aggregateBranches(r.webUrl, r.defaultBranch)),
            getTestsByRepoId(r.id),
            codeQualityByRepo(r.name, r.defaultBranch).then(aggregateCodeQuality),
            forProject(getCommits)(r.id).then(aggregateCommits),
            buildsByRepoId(r.id),
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
          codeQuality,
        };
      })
    );

    const releaseAnalysis = aggregateReleases(
      projectConfig,
      releases,
      policyConfigurationByRepoBranch
    );

    const analysisResults: ProjectAnalysis = {
      repoAnalysis: addPipelinesToRepos(releaseAnalysis, repoAnalysis),
      releaseAnalysis,
      workItemAnalysis,
      workItemLabel: projectConfig.workitems.label,
      testCasesAnalysis,
      featureToggles: await featureTogglesForRepos(repos.map(prop('id'))),
    };

    // await writeTimelinesToDb;
    analyserLog(`Took ${time()} to analyse ${collection.name}/${projectConfig.name}.`);

    return analysisResults;
  };
};
