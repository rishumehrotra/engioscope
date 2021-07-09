/* eslint-disable no-console */
import { promises as fs } from 'fs';
import { join } from 'path';
import projectAnalyser from './project-analyser';
import { average } from './stats-aggregators/ratings';
import { ScrapedProject } from '../shared-types';
import { shortDateFormat } from './utils';
import { Config } from './types';

process.on('uncaughtException', console.log);
process.on('unhandledRejection', console.log);

const dataFolderPath = join(process.cwd(), 'data');

const createDataFolder = fs.mkdir(dataFolderPath, { recursive: true });

const writeFile = (path: string, contents: string) => {
  console.log('Writing file', join(dataFolderPath, path));
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
        const start = Date.now();
        console.log('Starting analysis for', projectSpec.join('/'));
        const analysis = await analyseProject(...projectSpec);
        const now = shortDateFormat(new Date());
        console.log(`Took ${Date.now() - start}ms to analyse`, projectSpec.join('/'));
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
