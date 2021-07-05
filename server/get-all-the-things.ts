/* eslint-disable no-console */
import { promises as fs } from 'fs';
import { join } from 'path';
import analyseRepos from './analyse-repos';
import { average } from './analyse-repos/ratings';
import { ScrapedProject } from '../shared-types';
import { shortDateFormat } from './utils';
import config from './config';

process.on('uncaughtException', console.log);
process.on('unhandledRejection', console.log);

const dataFolderPath = process.env.NODE_ENV === 'production'
  ? join(__dirname, '..', 'build', 'data')
  : join(__dirname, '..', 'public', 'data');

const createDataFolder = fs.mkdir(dataFolderPath, { recursive: true });

const writeFile = (path: string, contents: string) => {
  console.log('Writing file', join(dataFolderPath, path));
  return fs.writeFile(
    join(dataFolderPath, path),
    contents,
    'utf8'
  );
};

const doAllTheThings = async () => {
  await createDataFolder;

  const overallResults: ScrapedProject[] = await Promise.all(
    config.projects
      .map(async projectSpec => {
        const start = Date.now();
        console.log('Starting analysis for', projectSpec.join('/'));
        const repos = await analyseRepos(...projectSpec);
        const now = shortDateFormat(new Date());
        console.log(`Took ${Date.now() - start}ms to analyse`, projectSpec.join('/'));
        await writeFile(
          `${projectSpec.join('_')}.json`,
          JSON.stringify({ lastUpdated: now, name: projectSpec, repos })
        );

        return {
          name: projectSpec,
          lastUpdated: now,
          rating: average(repos.map(r => r.rating))
        };
      })
  );

  return writeFile('index.json', JSON.stringify(overallResults));
};

doAllTheThings().catch(e => {
  console.log(e);
  throw e;
});
