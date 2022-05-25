import AwaitLock from 'await-lock';
import { promises as fs } from 'fs';
import { join } from 'path';
import debug from 'debug';
import { singular } from 'pluralize';
import type {
  AnalysedProjects, GlobalUIConfig, ProjectOverviewAnalysis, ProjectReleasePipelineAnalysis,
  ProjectRepoAnalysis, ProjectWorkItemAnalysis, ScrapedProject, SummaryMetrics,
  UIChangeProgram, UIChangeProgramTask, UIProjectAnalysis
} from '../../shared/types';
import { doesFileExist, queryPeriodDays } from '../utils';
import type { ProjectAnalysis } from './types';
import type { ParsedConfig, ParsedProjectConfig } from './parse-config';

const outputFileLog = debug('write-output');

// Ugh OO, tainting my beautiful FP palace
const lock = new AwaitLock();
const acquireLock = lock.acquireAsync.bind(lock);
const releaseLock = lock.release.bind(lock);

const dataFolderPath = join(process.cwd(), 'data');
const overallSummaryFilePath = join(dataFolderPath, 'index.json');
const createDataFolder = fs.mkdir(dataFolderPath, { recursive: true });

const projectName = (project: string | ParsedProjectConfig) => (
  typeof project === 'string' ? project : project.name
);

const writeFile = async (path: string[], fileName: string, contents: string) => {
  outputFileLog('Writing', join(dataFolderPath, ...path, fileName).replace(`${process.cwd()}/`, ''));
  await fs.mkdir(join(dataFolderPath, ...path), { recursive: true });
  return fs.writeFile(join(dataFolderPath, ...path, fileName), contents, 'utf8');
};

const projectSummary = (
  config: ParsedConfig,
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
): UIProjectAnalysis => ({
  name: [collectionName, projectConfig.name],
  lastUpdated: new Date().toISOString(),
  hasSummary: Boolean(config.azure.summaryPageGroups?.[0]),
  changeProgramName: config.azure.collections.find(c => c.name === collectionName)?.changeProgram?.name,
  reposCount: projectAnalysis.repoAnalysis.length,
  releasePipelineCount: projectAnalysis.releaseAnalysis.pipelines.length,
  workItemCount: Object.values(projectAnalysis.workItemAnalysis?.analysedWorkItems?.ids[0] || {}).length || 0,
  workItemLabel: [singular(projectAnalysis.workItemLabel), projectAnalysis.workItemLabel],
  queryPeriodDays: queryPeriodDays(config)
});

const writeRepoAnalysisFile = async (
  config: ParsedConfig,
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectRepoAnalysis = {
    ...projectSummary(config, collectionName, projectConfig, projectAnalysis),
    repos: projectAnalysis.repoAnalysis,
    groups: projectConfig.groupRepos
  };
  return writeFile(
    [collectionName, projectConfig.name],
    'repos.json',
    JSON.stringify(analysis)
  );
};

const writeReleaseAnalysisFile = async (
  config: ParsedConfig,
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectReleasePipelineAnalysis = {
    ...projectSummary(config, collectionName, projectConfig, projectAnalysis),
    ...projectAnalysis.releaseAnalysis,
    stagesToHighlight: projectConfig.releasePipelines?.stagesToHighlight,
    ignoreStagesBefore: projectConfig.releasePipelines?.ignoreStagesBefore,
    groups: projectConfig.groupRepos,
    environments: projectConfig.environments
  };
  return writeFile(
    [collectionName, projectConfig.name],
    'releases.json',
    JSON.stringify(analysis)
  );
};

const writeWorkItemAnalysisFile = async (
  config: ParsedConfig,
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectWorkItemAnalysis = {
    ...projectSummary(config, collectionName, projectConfig, projectAnalysis),
    workItems: projectAnalysis.workItemAnalysis.analysedWorkItems,
    taskType: projectConfig.workitems.label
  };
  return writeFile(
    [collectionName, projectConfig.name],
    'work-items.json',
    JSON.stringify(analysis)
  );
};

const writeOverviewFile = async (
  config: ParsedConfig,
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectOverviewAnalysis = {
    ...projectSummary(config, collectionName, projectConfig, projectAnalysis),
    overview: projectAnalysis.workItemAnalysis?.overview,
    testCases: projectAnalysis.testCasesAnalysis,
    ignoreForWIP: projectConfig.workitems.ignoreForWIP,
    environments: projectConfig.environments
  };
  return writeFile(
    [collectionName, projectConfig.name],
    'overview.json',
    JSON.stringify(analysis)
  );
};

const matchingProject = (projectSpec: readonly [string, string | ParsedProjectConfig]) => (scrapedProject: { name: [string, string] }) => (
  scrapedProject.name[0] === projectSpec[0]
    && scrapedProject.name[1] === projectName(projectSpec[1])
);

const readOverallSummaryFile = async (): Promise<AnalysedProjects> => {
  await createDataFolder;
  return (await doesFileExist(overallSummaryFilePath))
    ? JSON.parse(await fs.readFile(overallSummaryFilePath, 'utf-8'))
    : { projects: [], lastUpdated: null, hasSummary: false };
};

const populateWithEmptyValuesIfNeeded = (config: ParsedConfig) => (projectAnalysis: AnalysedProjects): AnalysedProjects => {
  const projects = config.azure.collections.flatMap(collection => (
    collection.projects.map(project => [collection.name, projectName(project)] as ScrapedProject['name'])
  ));

  return {
    ...projectAnalysis,
    projects: projects.map(configProjectSpec => {
      const matchingExistingProject = projectAnalysis.projects.find(matchingProject(configProjectSpec));
      if (matchingExistingProject) return matchingExistingProject;
      return { name: configProjectSpec, rating: null } as ScrapedProject;
    })
  };
};

const writeOverallSummaryFile = (analysedProjects: AnalysedProjects) => (
  writeFile(['./'], 'index.json', JSON.stringify(analysedProjects))
);

const updateOverallSummary = (config: ParsedConfig) => (scrapedProject: ScrapedProject) => (
  acquireLock()
    .then(readOverallSummaryFile)
    .then(populateWithEmptyValuesIfNeeded(config))
    .then(analysedProjects => ({
      ...analysedProjects,
      hasSummary: Boolean(config.azure.summaryPageGroups?.[0]),
      changeProgramName: config.azure.collections.find(c => c.name === scrapedProject.name[0])?.changeProgram?.name,
      lastUpdated: new Date().toISOString(),
      projects: analysedProjects.projects.map(p => (
        matchingProject(p.name)(scrapedProject) ? scrapedProject : p
      ))
    }))
    .then(writeOverallSummaryFile)
    .finally(releaseLock)
);

export default (config: ParsedConfig) => (collectionName: string, projectConfig: ParsedProjectConfig) => (
  (analysis: ProjectAnalysis) => Promise.all([
    writeRepoAnalysisFile(config, collectionName, projectConfig, analysis),
    writeReleaseAnalysisFile(config, collectionName, projectConfig, analysis),
    writeWorkItemAnalysisFile(config, collectionName, projectConfig, analysis),
    writeOverviewFile(config, collectionName, projectConfig, analysis),
    updateOverallSummary(config)({ name: [collectionName, projectConfig.name] })
  ])
);

export const writeSummaryMetricsFile = (config: ParsedConfig, summary: Omit<SummaryMetrics, keyof GlobalUIConfig>) => {
  const summaryMetrics: SummaryMetrics = {
    ...summary,
    lastUpdated: new Date().toISOString(),
    hasSummary: Boolean(config.azure.summaryPageGroups?.[0]),
    changeProgramName: config.azure.collections[0]?.changeProgram?.name,
    queryPeriodDays: queryPeriodDays(config)
  };

  return (
    writeFile(['./'], 'summary-metrics.json', JSON.stringify(summaryMetrics))
  );
};

export const writeChangeProgramFile = (config: ParsedConfig) => (tasks: UIChangeProgramTask[]) => {
  const someCollectionWithChangeProgram = config.azure.collections.find(c => c.changeProgram);

  const changeProgram: UIChangeProgram = {
    lastUpdated: new Date().toISOString(),
    changeProgramName: config.azure.collections[0]?.changeProgram?.name,
    queryPeriodDays: queryPeriodDays(config),
    hasSummary: Boolean(config.azure.summaryPageGroups?.[0]),
    details: someCollectionWithChangeProgram
      ? {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        taskName: someCollectionWithChangeProgram.changeProgram!.workItemTypeName,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        name: someCollectionWithChangeProgram.changeProgram!.name,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        startedState: someCollectionWithChangeProgram.changeProgram!.startedState,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        doneState: someCollectionWithChangeProgram.changeProgram!.doneState,
        tasks
      }
      : null
  };

  return writeFile(['./'], 'change-program.json', JSON.stringify(changeProgram));
};
