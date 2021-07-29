/* eslint-disable no-console */
import chalk from 'chalk';
import debug from 'debug';
import { zip } from 'rambda';
import aggregationWriter from './aggregation-writer';
import projectAnalyser from './project-analyser';
import { Config } from './types';

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

export default async (config: Config) => {
  const analyseProject = projectAnalyser(config);
  const writeToFile = aggregationWriter(config);
  const now = Date.now();

  const results = zip(
    config.projects,
    await Promise.allSettled(
      config.projects.map(async projectSpec => (
        analyseProject(...projectSpec).then(writeToFile(projectSpec))
      ))
    )
  );

  const successful = results.filter(result => result[1].status === 'fulfilled');
  const failed = results.filter(result => result[1].status === 'rejected');

  console.log('\n---\n');
  console.log('Fetching data for the followinng projects succeeded: \n');
  successful.forEach(success => {
    console.log(`  ${chalk.green('✓')} ${success[0].join('/')}`);
  });

  if (failed.length) {
    console.log('\n');
    console.log('Fetching data for the following projects failed: \n');
    failed.forEach(failure => {
      console.log(
        `  ${chalk.red('×')} ${failure[0].join('/')} - Reason: `,
        failure[1].status === 'rejected' && failure[1].reason
      );
    });
    console.log('\nRe-run this script to re-fetch the failed data. Data already fetched won\'t be refetched.');
    process.exit(1);
  }
  console.log('\n');

  debug('done')(`in ${(Date.now() - now) / 1000}s.`);
};
