import AwaitLock from 'await-lock';
import { promises as fs } from 'fs';
import { join } from 'path';
import debug from 'debug';
import type {
  ProjectReleasePipelineAnalysis, ProjectRepoAnalysis,
  ProjectWorkItemAnalysis, ScrapedProject, UIProjectAnalysis
} from '../../shared/types';
import { doesFileExist, map, shortDateFormat } from '../utils';
import type { Config, ProjectAnalysis, ProjectConfig } from './types';

const outputFileLog = debug('write-output');

// Ugh OO, tainting my beautiful FP palace
const lock = new AwaitLock();
const acquireLock = lock.acquireAsync.bind(lock);
const releaseLock = lock.release.bind(lock);

const dataFolderPath = join(process.cwd(), 'data');
const overallSummaryFilePath = join(dataFolderPath, 'index.json');
const createDataFolder = fs.mkdir(dataFolderPath, { recursive: true });

const projectName = (project: string | ProjectConfig) => (
  typeof project === 'string' ? project : project.name
);

const writeFile = (path: string, contents: string) => {
  outputFileLog('Writing', join(dataFolderPath, path).replace(`${process.cwd()}/`, ''));
  return fs.writeFile(join(dataFolderPath, path), contents, 'utf8');
};

const projectSummary = (
  collectionName: string,
  projectConfig: ProjectConfig,
  projectAnalysis: ProjectAnalysis
): UIProjectAnalysis => ({
  name: [collectionName, projectConfig.name],
  lastUpdated: shortDateFormat(new Date()),
  reposCount: projectAnalysis.repoAnalysis.length,
  releasePipelineCount: projectAnalysis.releaseAnalysis.length,
  workItemCount: Object.values(projectAnalysis.workItemAnalysis?.ids[0] || {}).length || 0,
  workItemLabel: projectAnalysis.workItemLabel
});

const writeRepoAnalysisFile = async (
  collectionName: string,
  projectConfig: ProjectConfig,
  projectAnalysis: ProjectAnalysis
) => (
  createDataFolder.then(() => {
    const analysis: ProjectRepoAnalysis = {
      ...projectSummary(collectionName, projectConfig, projectAnalysis),
      repos: projectAnalysis.repoAnalysis
    };
    return writeFile(`${collectionName}_${projectConfig.name}.json`, JSON.stringify(analysis));
  })
);

const writeReleaseAnalysisFile = async (
  collectionName: string,
  projectConfig: ProjectConfig,
  projectAnalysis: ProjectAnalysis
) => (
  createDataFolder.then(() => {
    const analysis: ProjectReleasePipelineAnalysis = {
      ...projectSummary(collectionName, projectConfig, projectAnalysis),
      pipelines: projectAnalysis.releaseAnalysis,
      stagesToHighlight: projectConfig.releasePipelines?.stagesToHighlight
    };
    return writeFile(`${collectionName}_${projectConfig.name}_releases.json`, JSON.stringify(analysis));
  })
);

const writeWorkItemAnalysisFile = async (
  collectionName: string,
  projectConfig: ProjectConfig,
  projectAnalysis: ProjectAnalysis
) => (
  createDataFolder.then(() => {
    const analysis: ProjectWorkItemAnalysis = {
      ...projectSummary(collectionName, projectConfig, projectAnalysis),
      workItems: projectAnalysis.workItemAnalysis,
      taskType: projectConfig.workitems?.groupUnder
    };
    return writeFile(`${collectionName}_${projectConfig.name}_work-items.json`, JSON.stringify(analysis));
  })
);

const matchingProject = (projectSpec: readonly [string, string | ProjectConfig]) => (scrapedProject: { name: [string, string] }) => (
  scrapedProject.name[0] === projectSpec[0]
    && scrapedProject.name[1] === projectName(projectSpec[1])
);

const readOverallSummaryFile = async (): Promise<ScrapedProject[]> => {
  await createDataFolder;
  return (await doesFileExist(overallSummaryFilePath))
    ? JSON.parse(await fs.readFile(overallSummaryFilePath, 'utf-8'))
    : [];
};

const populateWithEmptyValuesIfNeeded = (config: Config) => (scrapedProjects: ScrapedProject[]) => {
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
  createDataFolder.then(
    () => writeFile('index.json', JSON.stringify(scrapedProjects))
  )
);

const updateOverallSummary = (config: Config) => (scrapedProject: Omit<ScrapedProject, 'lastUpdated'>) => (
  acquireLock()
    .then(readOverallSummaryFile)
    .then(populateWithEmptyValuesIfNeeded(config))
    .then(map(p => (
      matchingProject(p.name)(scrapedProject)
        ? { ...scrapedProject, lastUpdated: shortDateFormat(new Date()) }
        : p
    )))
    .then(writeOverallSummaryFile)
    .finally(releaseLock)
);

export default (config: Config) => (collectionName: string, projectConfig: ProjectConfig) => (
  (analysis: ProjectAnalysis) => Promise.all([
    writeRepoAnalysisFile(collectionName, projectConfig, analysis),
    writeReleaseAnalysisFile(collectionName, projectConfig, analysis),
    writeWorkItemAnalysisFile(collectionName, projectConfig, analysis),
    updateOverallSummary(config)({ name: [collectionName, projectConfig.name] })
  ])
);
