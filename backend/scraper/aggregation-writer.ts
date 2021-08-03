import AwaitLock from 'await-lock';
import { promises as fs } from 'fs';
import { join } from 'path';
import debug from 'debug';
import {
  AnalysedWorkItem, ProjectReleasePipelineAnalysis, ProjectRepoAnalysis,
  ProjectWorkItemAnalysis, ReleasePipelineStats, RepoAnalysis, ScrapedProject
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
  outputFileLog('Writing file', join(dataFolderPath, path).replace(`${process.cwd()}/`, ''));
  return fs.writeFile(join(dataFolderPath, path), contents, 'utf8');
};

const writeRepoAnalysisFile = async (projectSpec: ProjectSpec, repoAnalysis: RepoAnalysis[], releasePipelineCount: number) => (
  createDataFolder.then(() => {
    const analysis: ProjectRepoAnalysis = {
      lastUpdated: shortDateFormat(new Date()),
      name: projectSpec,
      repos: repoAnalysis,
      releasePipelineCount
    };
    return writeFile(`${projectSpec.join('_')}.json`, JSON.stringify(analysis));
  })
);

const writeReleaseAnalysisFile = async (
  projectSpec: ProjectSpec,
  releaseAnalysis: ReleasePipelineStats[],
  reposCount: number,
  stagesToHighlight?: string[]
) => (
  createDataFolder.then(() => {
    const analysis: ProjectReleasePipelineAnalysis = {
      lastUpdated: shortDateFormat(new Date()),
      name: projectSpec,
      pipelines: releaseAnalysis,
      reposCount,
      stagesToHighlight
    };
    return writeFile(`${projectSpec.join('_')}_releases.json`, JSON.stringify(analysis));
  })
);

const writeWorkItemAnalysisFile = async (
  projectSpec: ProjectSpec,
  taskType: string | undefined,
  workItemAnalysis: AnalysedWorkItem[] | null
) => (
  createDataFolder.then(() => {
    const analysis: ProjectWorkItemAnalysis = {
      name: projectSpec,
      lastUpdated: shortDateFormat(new Date()),
      workItems: workItemAnalysis,
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
    writeRepoAnalysisFile(
      projectSpec,
      analysis.repoAnalysis,
      analysis.releaseAnalysis.length
    ),
    writeReleaseAnalysisFile(
      projectSpec,
      analysis.releaseAnalysis,
      analysis.repoAnalysis.length,
      config.azure.stagesToHighlight
    ),
    writeWorkItemAnalysisFile(
      projectSpec,
      config.azure.groupWorkItemsUnder,
      analysis.workItemAnalysis
    ),
    updateOverallSummary(config)({ name: projectSpec })
  ])
);
