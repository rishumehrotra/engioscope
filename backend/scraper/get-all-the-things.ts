/* eslint-disable no-console */
import chalk from 'chalk';
import debug from 'debug';
import { zip } from 'rambda';
import aggregationWriter from './aggregation-writer';
import type { ParsedConfig } from './parse-config';
import projectAnalyser from './project-analyser';
import workItemsForCollection from './stats-aggregators/work-items-for-collection';

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

export default async (config: ParsedConfig) => {
  const analyseProject = projectAnalyser(config);
  const writeToFile = aggregationWriter(config);
  const collectionWorkItems = workItemsForCollection(config);
  const now = Date.now();

  const projects = config.azure.collections.flatMap(collection => {
    const workItems = collectionWorkItems(collection);

    return collection.projects.map(project => ([
      collection,
      project,
      workItems(project)
    ] as const));
  });

  const results = zip(
    projects,
    await Promise.allSettled(
      projects.map(args => analyseProject(...args).then(writeToFile(args[0].name, args[1])))
    )
  );

  const successful = results.filter(result => result[1].status === 'fulfilled');
  const failed = results.filter(result => result[1].status === 'rejected');

  console.log('\n---\n');
  console.log('Fetching data for the followinng projects succeeded: \n');
  successful.forEach(success => {
    console.log(`  ${chalk.green('✓')} ${success[0][0].name}/${success[0][1].name}`);
  });

  if (failed.length) {
    console.log('\n');
    console.log('Fetching data for the following projects failed: \n');
    failed.forEach(failure => {
      console.log(
        `  ${chalk.red('×')} ${failure[0][0].name}/${failure[0][1].name} - Reason: `,
        failure[1].status === 'rejected' && failure[1].reason
      );
    });
    console.log('\nRe-run this script to re-fetch the failed data. Data already fetched won\'t be refetched.');
    process.exit(1);
  }
  console.log('\n');

  debug('done')(`in ${(Date.now() - now) / 1000}s.`);
};
