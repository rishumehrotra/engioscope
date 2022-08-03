/* eslint-disable no-console */
import chalk from 'chalk';
import debug from 'debug';
import { tap, zip } from 'rambda';
import tar from 'tar';
import { promises as fs } from 'fs';
import { join } from 'path';
import aggregationWriter, { writeChangeProgramFile, writeSummaryMetricsFile, writeTracks } from './aggregation-writer.js';
import azure from './network/azure.js';
import type { ParsedConfig } from './parse-config.js';
import projectAnalyser from './project-analyser.js';
import workItemsForCollection from './stats-aggregators/work-items-for-collection.js';
import type { ProjectAnalysis } from './types.js';
import summariseResults from './summarise-results.js';
import { fetchCounters } from './network/fetch-with-disk-cache.js';
import { mapSettleSeries, startTimer } from '../utils.js';
import changeProgramTasks from './stats-aggregators/change-program-tasks.js';
import getTracks from './get-tracks.js';

process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

const logStep = debug('step');

const scrape = async (config: ParsedConfig) => {
  logStep('Starting scrape...');
  const time = startTimer();

  const {
    getCollectionWorkItemFields, getCollectionWorkItemIdsForQuery,
    getCollectionWorkItems
  } = azure(config);
  const analyseProject = projectAnalyser(config);
  const writeToFile = aggregationWriter(config);
  const collectionWorkItems = workItemsForCollection(config);

  const changeProgramWorkItems = Promise.all(
    config.azure.collections.map(changeProgramTasks(
      getCollectionWorkItemIdsForQuery,
      getCollectionWorkItems
    ))
  ).then(x => x.flat());

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
    await mapSettleSeries(
      projects,
      args => analyseProject(...args).then(tap(writeToFile(args[0].name, args[1])))
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

  logStep(`Scraping completed in ${time()}`);

  await Promise.all([
    changeProgramWorkItems.then(writeChangeProgramFile(config)),
    writeTracks(config, getTracks(config, results.map(r => ({
      collectionConfig: r[0][0],
      projectConfig: r[0][1],
      analysisResult: (r[1].status === 'fulfilled' && r[1].value) as ProjectAnalysis
    })))),
    writeSummaryMetricsFile(config, summariseResults(
      config,
      results
        .map(r => ({
          collectionConfig: r[0][0],
          projectConfig: r[0][1],
          analysisResult: (r[1].status === 'fulfilled' && r[1].value) as ProjectAnalysis
        }))
    ))
  ]);
};

const printFetchCounters = () => {
  const counts = fetchCounters();
  debug('fetch-counters')('Made %d HTTP requests, had %d cache hits', counts.networkHits, counts.cacheHits);
};

const createTarGz = async () => {
  logStep('Creating data/cache.tar.gz...');
  const time = startTimer();
  await tar.create({
    gzip: true,
    file: 'data/cache.tar.gz'
  }, ['cache']);
  logStep(`Created data/cache.tar.gz in ${time()}`);
};

const saveToArchive = async () => {
  logStep('Saving to archive...');
  const time = startTimer();

  await fs.mkdir(join(process.cwd(), 'archive'), { recursive: true });
  const fileName = `cache-${new Date().toISOString().split('T')[0]}.tar.gz`;
  await fs.copyFile(
    join(process.cwd(), 'data', 'cache.tar.gz'),
    join(process.cwd(), 'archive', fileName)
  );

  logStep(`Saved to archive/${fileName} in ${time()}`);
};

export default (config: ParsedConfig) => {
  const time = startTimer();

  return scrape(config)
    .then(tap(printFetchCounters))
    .then(createTarGz)
    .then(saveToArchive)
    .then(() => debug('done')(`in ${time()}.`));
};
