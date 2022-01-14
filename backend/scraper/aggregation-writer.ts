import AwaitLock from 'await-lock';
import { promises as fs } from 'fs';
import { join } from 'path';
import debug from 'debug';
import { singular } from 'pluralize';
import { map } from 'rambda';
import type {
  ProjectOverviewAnalysis,
  ProjectReleasePipelineAnalysis, ProjectRepoAnalysis,
  ProjectWorkItemAnalysis, ScrapedProject, UIProjectAnalysis
} from '../../shared/types';
import { doesFileExist } from '../utils';
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
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
): UIProjectAnalysis => ({
  name: [collectionName, projectConfig.name],
  lastUpdated: new Date().toISOString(),
  reposCount: projectAnalysis.repoAnalysis.length,
  releasePipelineCount: projectAnalysis.releaseAnalysis.pipelines.length,
  workItemCount: Object.values(projectAnalysis.workItemAnalysis?.analysedWorkItems?.ids[0] || {}).length || 0,
  workItemLabel: [singular(projectAnalysis.workItemLabel), projectAnalysis.workItemLabel]
});

const writeRepoAnalysisFile = async (
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectRepoAnalysis = {
    ...projectSummary(collectionName, projectConfig, projectAnalysis),
    repos: projectAnalysis.repoAnalysis
  };
  return writeFile(
    [collectionName, projectConfig.name],
    'repos.json',
    JSON.stringify(analysis)
  );
};

const writeReleaseAnalysisFile = async (
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectReleasePipelineAnalysis = {
    ...projectSummary(collectionName, projectConfig, projectAnalysis),
    ...projectAnalysis.releaseAnalysis,
    stagesToHighlight: projectConfig.releasePipelines?.stagesToHighlight,
    ignoreStagesBefore: projectConfig.releasePipelines?.ignoreStagesBefore
  };
  return writeFile(
    [collectionName, projectConfig.name],
    'releases.json',
    JSON.stringify(analysis)
  );
};

const writeWorkItemAnalysisFile = async (
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectWorkItemAnalysis = {
    ...projectSummary(collectionName, projectConfig, projectAnalysis),
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
  collectionName: string,
  projectConfig: ParsedProjectConfig,
  projectAnalysis: ProjectAnalysis
) => {
  const analysis: ProjectOverviewAnalysis = {
    ...projectSummary(collectionName, projectConfig, projectAnalysis),
    overview: projectAnalysis.workItemAnalysis?.overview
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

const readOverallSummaryFile = async (): Promise<ScrapedProject[]> => {
  await createDataFolder;
  return (await doesFileExist(overallSummaryFilePath))
    ? JSON.parse(await fs.readFile(overallSummaryFilePath, 'utf-8'))
    : [];
};

const populateWithEmptyValuesIfNeeded = (config: ParsedConfig) => (scrapedProjects: ScrapedProject[]) => {
  const projects = config.azure.collections.flatMap(collection => (
    collection.projects.map(project => [collection.name, projectName(project)] as ScrapedProject['name'])
  ));

  return projects.map(configProjectSpec => {
    const matchingExistingProject = scrapedProjects.find(matchingProject(configProjectSpec));
    if (matchingExistingProject) return matchingExistingProject;
    return { name: configProjectSpec, lastUpdated: null, rating: null } as ScrapedProject;
  });
};

const writeOverallSummaryFile = (scrapedProjects: ScrapedProject[]) => (
  writeFile(['./'], 'index.json', JSON.stringify(scrapedProjects))
);

const updateOverallSummary = (config: ParsedConfig) => (scrapedProject: Omit<ScrapedProject, 'lastUpdated'>) => (
  acquireLock()
    .then(readOverallSummaryFile)
    .then(populateWithEmptyValuesIfNeeded(config))
    .then(map(p => (
      matchingProject(p.name)(scrapedProject)
        ? { ...scrapedProject, lastUpdated: new Date().toISOString() }
        : p
    )))
    .then(writeOverallSummaryFile)
    .finally(releaseLock)
);

export default (config: ParsedConfig) => (collectionName: string, projectConfig: ParsedProjectConfig) => (
  (analysis: ProjectAnalysis) => Promise.all([
    writeRepoAnalysisFile(collectionName, projectConfig, analysis),
    writeReleaseAnalysisFile(collectionName, projectConfig, analysis),
    writeWorkItemAnalysisFile(collectionName, projectConfig, analysis),
    writeOverviewFile(collectionName, projectConfig, analysis),
    updateOverallSummary(config)({ name: [collectionName, projectConfig.name] })
  ])
);
