import AwaitLock from 'await-lock';
import { promises as fs } from 'fs';
import { join } from 'path';
import debug from 'debug';
import {
  ProjectRepoAnalysis, ReleaseStats, RepoAnalysis, ScrapedProject
} from '../../shared/types';
import { doesFileExist, map, shortDateFormat } from '../utils';
import { Config, ProjectAnalysis } from './types';

type ProjectSpec = Config['projects'][number];

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

const writeRepoAnalysisFile = async (projectSpec: ProjectSpec, repoAnalysis: RepoAnalysis[]) => (
  createDataFolder.then(() => (
    writeFile(`${projectSpec.join('_')}.json`, JSON.stringify({
      lastUpdated: shortDateFormat(new Date()),
      name: projectSpec,
      repos: repoAnalysis
    } as ProjectRepoAnalysis))
  ))
);

const writeReleaseAnalysisFile = async (projectSpec: ProjectSpec, releaseAnalysis: ReleaseStats[]) => (
  createDataFolder.then(() => (
    writeFile(`${projectSpec.join('_')}_releases.json`, JSON.stringify(releaseAnalysis))
  ))
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

const populateWithEmptyValuesIfNeeded = (config: Config) => (scrapedProjects: ScrapedProject[]) => (
  config.projects.map(configProjectSpec => {
    const matchingExistingProject = scrapedProjects.find(matchingProject(configProjectSpec));
    if (matchingExistingProject) return matchingExistingProject;
    return { name: configProjectSpec, lastUpdated: null, rating: null };
  })
);

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
    writeRepoAnalysisFile(projectSpec, analysis.repoAnalysis),
    writeReleaseAnalysisFile(projectSpec, analysis.releaseAnalysis),
    updateOverallSummary(config)({ name: projectSpec })
  ])
);
