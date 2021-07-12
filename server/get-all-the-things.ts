import { promises as fs } from 'fs';
import { join } from 'path';
import debug from 'debug';
import projectAnalyser from './project-analyser';
import { average } from './stats-aggregators/ratings';
import { ScrapedProject } from '../shared-types';
import { shortDateFormat } from './utils';
import { Config } from './types';

const outputFileLog = debug('output-file');

// eslint-disable-next-line no-console
process.on('uncaughtException', console.error);
// eslint-disable-next-line no-console
process.on('unhandledRejection', console.error);

const dataFolderPath = join(process.cwd(), 'data');
const createDataFolder = fs.mkdir(dataFolderPath, { recursive: true });

const writeFile = (path: string, contents: string) => {
  outputFileLog('Writing file', join(dataFolderPath, path).replace(`${process.cwd()}/`, ''));
  return fs.writeFile(
    join(dataFolderPath, path),
    contents,
    'utf8'
  );
};

export default async (config: Config) => {
  await createDataFolder;
  const analyseProject = projectAnalyser(config);

  const overallResults: ScrapedProject[] = await Promise.all(
    config.projects
      .map(async projectSpec => {
        const analysis = await analyseProject(...projectSpec);
        const now = shortDateFormat(new Date());
        await writeFile(
          `${projectSpec.join('_')}.json`,
          JSON.stringify({ lastUpdated: now, name: projectSpec, repos: analysis })
        );

        return {
          name: projectSpec,
          lastUpdated: now,
          rating: average(analysis.map(r => r.rating))
        };
      })
  );

  return writeFile('index.json', JSON.stringify(overallResults));
};
