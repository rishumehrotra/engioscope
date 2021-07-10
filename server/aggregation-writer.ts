import AwaitLock from 'await-lock';
import { promises as fs } from 'fs';
import { join } from 'path';
import debug from 'debug';
import { average } from './stats-aggregators/ratings';
import { RepoAnalysis, ScrapedProject } from '../shared-types';
import { doesFileExist, map, shortDateFormat } from './utils';
import { Config } from './types';

type ProjectSpec = Config['projects'][number];

const outputFileLog = debug('output-file');

// Ugh OO, tainting my beautiful FP palace
const lock = new AwaitLock();
const acquireLock = lock.acquireAsync.bind(lock);
const releaseLock = lock.release.bind(lock);

const dataFolderPath = join(process.cwd(), 'data');
const overallSummaryFilePath = join(dataFolderPath, 'index.json');
const createDataFolder = fs.mkdir(dataFolderPath, { recursive: true });

const writeFile = (path: string, contents: string) => {
  outputFileLog('Writing file', join(dataFolderPath, path).replace(`${process.cwd()}/`, ''));
  return fs.writeFile(
    join(dataFolderPath, path),
    contents,
    'utf8'
  );
};

const writeProjectSummaryFile = async (projectSpec: ProjectSpec, analysis: RepoAnalysis[]) => {
  await createDataFolder;
  const now = shortDateFormat(new Date());

  return writeFile(`${projectSpec.join('_')}.json`, JSON.stringify({
    lastUpdated: now, name: projectSpec, repos: analysis
  }));
};

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

export default (config: Config) => (projectSpec: ProjectSpec) => async (analysis: RepoAnalysis[]) => {
  await Promise.all([
    writeProjectSummaryFile(projectSpec, analysis),
    updateOverallSummary(config)({
      name: projectSpec,
      rating: average(analysis.map(r => r.rating))
    })
  ]);
};
