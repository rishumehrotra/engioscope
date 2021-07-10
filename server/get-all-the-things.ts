import { promises as fs } from 'fs';
import { join } from 'path';
import debug from 'debug';
import projectAnalyser from './project-analyser';
import { Config } from './types';
import aggregationWriter from './aggregation-writer';

// eslint-disable-next-line no-console
process.on('uncaughtException', console.error);
// eslint-disable-next-line no-console
process.on('unhandledRejection', console.error);

const dataFolderPath = join(process.cwd(), 'data');
const createDataFolder = fs.mkdir(dataFolderPath, { recursive: true });

export default async (config: Config) => {
  await createDataFolder;
  const analyseProject = projectAnalyser(config);
  const writeToFile = aggregationWriter(config);
  const now = Date.now();

  await Promise.all(
    config.projects
      .map(async projectSpec => (
        analyseProject(...projectSpec).then(writeToFile(projectSpec))
      ))
  );

  debug('done')(`in ${(Date.now() - now) / 1000}s.`);
};
