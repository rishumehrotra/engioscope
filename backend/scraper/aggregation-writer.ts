import AwaitLock from 'await-lock';
import { promises as fs } from 'fs';
import { join } from 'path';
import debug from 'debug';
import {
  ProjectReleasePipelineAnalysis, ProjectRepoAnalysis,
  ProjectWorkItemAnalysis, ScrapedProject, UIProjectAnalysis
} from '../../shared/types';
import { doesFileExist, map, shortDateFormat } from '../utils';
import { Config, ProjectAnalysis } from './types';

type ProjectSpec = [collectionName: string, projectName: string];

const outputFileLog = debug('write-output');

// Ugh OO, tainting my beautiful FP palace
const lock = new AwaitLock();
const acquireLock = lock.acquireAsync.bind(lock);
const releaseLock = lock.release.bind(lock);

const dataFolderPath = join(process.cwd(), 'data');
const overallSummaryFilePath = join(dataFolderPath, 'index.json');
const createDataFolder = fs.mkdir(dataFolderPath, { recursive: true });

const writeFile = (path: string, contents: string) => {
  outputFileLog('Writing', join(dataFolderPath, path).replace(`${process.cwd()}/`, ''));
  return fs.writeFile(join(dataFolderPath, path), contents, 'utf8');
};

const projectSummary = (
  projectSpec: ProjectSpec,
  projectAnalysis: ProjectAnalysis
): UIProjectAnalysis => ({
  name: projectSpec,
  lastUpdated: shortDateFormat(new Date()),
  reposCount: projectAnalysis.repoAnalysis.length,
  releasePipelineCount: projectAnalysis.releaseAnalysis.length,
  workItemCount: Object.values(projectAnalysis.workItemAnalysis?.ids[0] || {}).length || 0,
  workItemLabel: projectAnalysis.workItemLabel
});

const writeRepoAnalysisFile = async (
  projectSpec: ProjectSpec,
  projectAnalysis: ProjectAnalysis
) => (
  createDataFolder.then(() => {
    const analysis: ProjectRepoAnalysis = {
      ...projectSummary(projectSpec, projectAnalysis),
      repos: projectAnalysis.repoAnalysis
    };
    return writeFile(`${projectSpec.join('_')}.json`, JSON.stringify(analysis));
  })
);

const writeReleaseAnalysisFile = async (
  projectSpec: ProjectSpec,
  projectAnalysis: ProjectAnalysis,
  stagesToHighlight: string[] | undefined
) => (
  createDataFolder.then(() => {
    const analysis: ProjectReleasePipelineAnalysis = {
      ...projectSummary(projectSpec, projectAnalysis),
      pipelines: projectAnalysis.releaseAnalysis,
      stagesToHighlight
    };
    return writeFile(`${projectSpec.join('_')}_releases.json`, JSON.stringify(analysis));
  })
);

const writeWorkItemAnalysisFile = async (
  projectSpec: ProjectSpec,
  projectAnalysis: ProjectAnalysis,
  taskType: string | undefined
) => (
  createDataFolder.then(() => {
    const analysis: ProjectWorkItemAnalysis = {
      ...projectSummary(projectSpec, projectAnalysis),
      workItems: projectAnalysis.workItemAnalysis,
      taskType
    };
    return writeFile(`${projectSpec.join('_')}_work-items.json`, JSON.stringify(analysis));
  })
);

const matchingProject = (projectSpec: ProjectSpec) => (scrapedProject: { name: ProjectSpec }) => (
  scrapedProject.name[0] === projectSpec[0]
    && scrapedProject.name[1] === projectSpec[1]
);

const readOverallSummaryFile = async (): Promise<ScrapedProject[]> => {
  await createDataFolder;
  return (await doesFileExist(overallSummaryFilePath))
    ? JSON.parse(await fs.readFile(overallSummaryFilePath, 'utf-8'))
    : [];
};

const populateWithEmptyValuesIfNeeded = (config: Config) => (scrapedProjects: ScrapedProject[]) => {
  const projects = config.azure.collections.flatMap(collection => (
    collection.projects.map(project => [collection.name, project] as ProjectSpec)
  ));

  return projects.map(configProjectSpec => {
    const matchingExistingProject = scrapedProjects.find(matchingProject(configProjectSpec));
    if (matchingExistingProject) return matchingExistingProject;
    return { name: configProjectSpec, lastUpdated: null, rating: null };
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

export default (config: Config) => (projectSpec: ProjectSpec) => (
  (analysis: ProjectAnalysis) => Promise.all([
    writeRepoAnalysisFile(projectSpec, analysis),
    writeReleaseAnalysisFile(projectSpec, analysis, config.azure.stagesToHighlight),
    writeWorkItemAnalysisFile(projectSpec, analysis, config.azure.workitems?.groupUnder),
    updateOverallSummary(config)({ name: projectSpec })
  ])
);
