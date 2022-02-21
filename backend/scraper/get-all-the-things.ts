/* eslint-disable no-console */
import chalk from 'chalk';
import debug from 'debug';
import { tap, zip } from 'rambda';
import tar from 'tar';
import { promises as fs } from 'fs';
import { join } from 'path';
import aggregationWriter from './aggregation-writer';
import azure from './network/azure';
import type { ParsedConfig } from './parse-config';
import projectAnalyser from './project-analyser';
import workItemsForCollection from './stats-aggregators/work-items-for-collection';
import type { ProjectAnalysis } from './types';
import summariseResults from './summarise-results';

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

const logStep = debug('step');

const scrape = async (config: ParsedConfig) => {
  logStep('Starting scrape...');
  const { getCollectionWorkItemFields } = azure(config);
  const analyseProject = projectAnalyser(config);
  const writeToFile = aggregationWriter(config);
  const collectionWorkItems = workItemsForCollection(config);
  const now = Date.now();

  const projects = config.azure.collections.flatMap(collection => {
    // Execute these only once per collection
    const workItems = collectionWorkItems(collection);
    const workItemFields = getCollectionWorkItemFields(collection.name);

    return collection.projects.map(project => ([
      collection,
      project,
      workItems,
      workItemFields
    ] as const));
  });

  const results = zip(
    projects,
    await Promise.allSettled(
      projects.map(
        args => analyseProject(...args).then(tap(writeToFile(args[0].name, args[1])))
      )
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

  logStep(`Scraping completed in ${(Date.now() - now) / 1000}s.`);

  const summarised = summariseResults(
    config,
    results
      .map(r => ({
        collectionConfig: r[0][0],
        projectConfig: r[0][1],
        analysisResult: (r[1].status === 'fulfilled' && r[1].value) as ProjectAnalysis
      }))
  );
  console.log(summarised);
};

const createTarGz = async () => {
  logStep('Creating data/cache.tar.gz...');
  const startTime = Date.now();
  await tar.create({
    gzip: true,
    file: 'data/cache.tar.gz'
  }, ['cache']);
  logStep(`Created data/cache.tar.gz in ${(Date.now() - startTime) / 1000}s`);
};

const saveToArchive = async () => {
  logStep('Saving to archive...');
  const startTime = Date.now();

  await fs.mkdir(join(process.cwd(), 'archive'), { recursive: true });
  const fileName = `cache-${new Date().toISOString().split('T')[0]}.tar.gz`;
  await fs.copyFile(
    join(process.cwd(), 'data', 'cache.tar.gz'),
    join(process.cwd(), 'archive', fileName)
  );

  logStep(`Saved to archive/${fileName} in ${(Date.now() - startTime) / 1000}s`);
};

export default (config: ParsedConfig) => {
  const startTime = Date.now();

  return scrape(config)
    .then(createTarGz)
    .then(saveToArchive)
    .then(() => debug('done')(`in ${(Date.now() - startTime) / 1000}s.`));
};
